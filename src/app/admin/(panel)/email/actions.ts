"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { buildReplyOutboundContent } from "@/lib/mail";
import {
  bumpThreadRootActivity,
  buildThreadReferences,
  collectThreadMessageIds,
  findThreadRootId,
} from "@/lib/mail-thread";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import {
  getSmtpConfigFromSettings,
  isSmtpReady,
  sendMailWithConfig,
} from "@/lib/smtp";

export type MailActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Oturum bulunamadı.");
  }
  return session;
}

function revalidateMail() {
  revalidatePath("/admin/email");
  revalidatePath("/admin", "layout");
}

/** Yanıta eklenecek müşteri mesajını bulur (mümkünse gelen kutusu / iletişim formu) */
async function resolveCustomerQuoteMessage(parent: {
  id: string;
  folder: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
}) {
  if (parent.folder !== "SENT") {
    return parent;
  }

  const rootId = await findThreadRootId(parent.id);
  const threadIds = await collectThreadMessageIds(rootId);
  const inbound = await prisma.mailMessage.findMany({
    where: {
      id: { in: threadIds },
      folder: { not: "SENT" },
    },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: 1,
  });

  return inbound[0] ?? parent;
}

export async function markMailReadAction(id: string, isRead = true) {
  await requireAdmin();
  const rootId = await findThreadRootId(id);
  const threadIds = await collectThreadMessageIds(rootId);

  await prisma.mailMessage.updateMany({
    where: { id: { in: threadIds } },
    data: { isRead },
  });
  revalidateMail();
}

export async function toggleMailStarAction(id: string) {
  await requireAdmin();
  const current = await prisma.mailMessage.findUnique({
    where: { id },
    select: { isStarred: true },
  });
  if (!current) throw new Error("Mesaj bulunamadı.");

  await prisma.mailMessage.update({
    where: { id },
    data: { isStarred: !current.isStarred },
  });
  revalidateMail();
}

export async function moveMailToFolderAction(
  id: string,
  folder: "INBOX" | "SPAM" | "TRASH" | "DRAFT",
) {
  await requireAdmin();
  await prisma.mailMessage.update({
    where: { id },
    data: { folder },
  });
  revalidateMail();
}

export async function replyMailAction(
  _prev: MailActionState,
  formData: FormData,
): Promise<MailActionState> {
  try {
    await requireAdmin();

    const parentId = String(formData.get("parentId") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    if (!parentId) return { error: "Yanıtlanacak mesaj bulunamadı." };
    if (!body) return { error: "Yanıt metni boş olamaz." };

    const parent = await prisma.mailMessage.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "Orijinal mesaj bulunamadı." };

    const settings = await getSettingsMapUncached();
    const smtp = getSmtpConfigFromSettings(settings);
    const to =
      parent.folder === "SENT"
        ? parent.toEmail
        : parent.replyToEmail || parent.fromEmail;

    if (!isSmtpReady(smtp)) {
      return {
        error:
          "SMTP henüz hazır değil. Ayarlar → E-posta bölümünden SMTP’yi kaydedip test edin.",
      };
    }

    const subject = parent.subject.startsWith("Re:")
      ? parent.subject
      : `Re: ${parent.subject}`;

    // Contact form kökünde Message-ID yoksa üret; In-Reply-To / References için gerekli
    if (!parent.externalId) {
      const generatedId = `contact.${parent.id}@local`;
      await prisma.mailMessage.update({
        where: { id: parent.id },
        data: { externalId: generatedId },
      });
      parent.externalId = generatedId;
    }

    const threadHeaders = await buildThreadReferences(parent.id);

    // Müşteriye giden e-postada orijinal mesajı da ekle (hatırlatma)
    const quoteTarget = await resolveCustomerQuoteMessage(parent);
    const outbound = buildReplyOutboundContent(body, {
      fromName: quoteTarget.fromName,
      fromEmail: quoteTarget.fromEmail,
      subject: quoteTarget.subject,
      bodyText: quoteTarget.bodyText,
      bodyHtml: quoteTarget.bodyHtml,
      receivedAt: quoteTarget.receivedAt,
    });

    const info = await sendMailWithConfig(smtp, {
      to,
      subject,
      text: outbound.text,
      html: outbound.html,
      replyTo: smtp.replyTo || smtp.fromEmail,
      inReplyTo: threadHeaders.inReplyTo,
      references: threadHeaders.references,
    });

    const preview = body.replace(/\s+/g, " ").slice(0, 180);
    const externalId = info.messageId
      ? String(info.messageId).replace(/^<|>$/g, "")
      : null;

    await prisma.$transaction([
      prisma.mailMessage.create({
        data: {
          folder: "SENT",
          source: "COMPOSED",
          fromName: smtp.fromName,
          fromEmail: smtp.fromEmail,
          toEmail: to,
          subject,
          preview,
          bodyText: body,
          isRead: true,
          parentId: parent.id,
          label: parent.label,
          externalId,
          receivedAt: new Date(),
        },
      }),
      prisma.mailMessage.update({
        where: { id: parent.id },
        data: { isRead: true },
      }),
    ]);

    await bumpThreadRootActivity(parent.id, {
      preview: `Siz: ${preview}`,
      receivedAt: new Date(),
    });

    revalidateMail();
    return { success: true, message: "Yanıt gönderildi." };
  } catch (error) {
    console.error("[mail-reply]", error);
    return {
      error: error instanceof Error ? error.message : "Yanıt gönderilemedi.",
    };
  }
}

export async function composeMailAction(
  _prev: MailActionState,
  formData: FormData,
): Promise<MailActionState> {
  try {
    await requireAdmin();

    const to = String(formData.get("to") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const asDraft = String(formData.get("asDraft") ?? "") === "1";

    if (!to) return { error: "Alıcı e-posta gerekli." };
    if (!subject) return { error: "Konu gerekli." };
    if (!body) return { error: "Mesaj metni gerekli." };

    const settings = await getSettingsMapUncached();
    const smtp = getSmtpConfigFromSettings(settings);

    if (asDraft) {
      await prisma.mailMessage.create({
        data: {
          folder: "DRAFT",
          source: "COMPOSED",
          fromName: smtp.fromName || "Admin",
          fromEmail: smtp.fromEmail || smtp.user || "admin@local",
          toEmail: to,
          subject,
          preview: body.replace(/\s+/g, " ").slice(0, 180),
          bodyText: body,
          isRead: true,
          receivedAt: new Date(),
        },
      });
      revalidateMail();
      return { success: true, message: "Taslak kaydedildi." };
    }

    if (!isSmtpReady(smtp)) {
      return {
        error:
          "SMTP henüz hazır değil. Ayarlar → E-posta bölümünden SMTP’yi kaydedip test edin.",
      };
    }

    await sendMailWithConfig(smtp, {
      to,
      subject,
      text: body,
      replyTo: smtp.replyTo || smtp.fromEmail,
    });

    await prisma.mailMessage.create({
      data: {
        folder: "SENT",
        source: "COMPOSED",
        fromName: smtp.fromName,
        fromEmail: smtp.fromEmail,
        toEmail: to,
        subject,
        preview: body.replace(/\s+/g, " ").slice(0, 180),
        bodyText: body,
        isRead: true,
        receivedAt: new Date(),
      },
    });

    revalidateMail();
    return { success: true, message: "Mesaj gönderildi." };
  } catch (error) {
    console.error("[mail-compose]", error);
    return {
      error: error instanceof Error ? error.message : "Mesaj gönderilemedi.",
    };
  }
}

export async function loadMoreMailMessagesAction(input: {
  folder: string;
  label?: string | null;
  q?: string | null;
  cursor: string;
}) {
  await requireAdmin();
  const { listMailMessagesPage } = await import("@/lib/mail-queries");
  return listMailMessagesPage({
    folder: input.folder,
    label: input.label,
    q: input.q,
    cursor: input.cursor,
  });
}

export async function syncImapInboxAction(): Promise<MailActionState> {
  try {
    await requireAdmin();
    const { syncImapInboxNow } = await import("@/lib/mail-imap-sync");
    const result = await syncImapInboxNow();

    if (result.skipped) {
      return { message: "Gelen kutusu yakın zamanda senkronize edildi." };
    }

    revalidateMail();

    if (result.timedOut) {
      return {
        error:
          "IMAP bağlantısı zaman aşımına uğradı. Ayarlarınızı kontrol edip tekrar deneyin.",
      };
    }

    return {
      success: true,
      message:
        result.imported > 0
          ? `${result.imported} yeni mesaj alındı.`
          : "Yeni mesaj bulunamadı.",
    };
  } catch (error) {
    console.error("[imap-sync-action]", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Gelen kutusu senkronize edilemedi.",
    };
  }
}
