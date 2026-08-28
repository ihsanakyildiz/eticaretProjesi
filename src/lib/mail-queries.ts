import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MAIL_FOLDER_MAP,
  resolveMailFolderKey,
  resolveMailLabelKey,
  toMailListItem,
  toMailListSummaryItem,
  type MailFolderKey,
  type MailListItem,
} from "@/lib/mail";

export type MailFolderCounts = Record<MailFolderKey, number> & {
  labels: Record<string, number>;
  unreadInbox: number;
};

const MAIL_LIST_SELECT = {
  id: true,
  folder: true,
  source: true,
  fromName: true,
  fromEmail: true,
  toEmail: true,
  subject: true,
  preview: true,
  isRead: true,
  isStarred: true,
  hasAttachment: true,
  label: true,
  receivedAt: true,
  parentId: true,
} satisfies Prisma.MailMessageSelect;

const MAIL_LIST_PAGE_SIZE = 30;

export type MailListCursor = {
  receivedAt: string;
  id: string;
};

export type MailListPage = {
  items: MailListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function encodeMailListCursor(row: {
  receivedAt: Date;
  id: string;
}): string {
  const payload: MailListCursor = {
    receivedAt: row.receivedAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeMailListCursor(
  raw: string | null | undefined,
): MailListCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as MailListCursor;
    if (typeof parsed.receivedAt === "string" && typeof parsed.id === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function buildMailListWhere(options: {
  folder?: string | null;
  label?: string | null;
  q?: string | null;
  cursor?: string | null;
}): Prisma.MailMessageWhereInput {
  const folderKey = resolveMailFolderKey(options.folder);
  const label = resolveMailLabelKey(options.label);
  const q = (options.q ?? "").trim();
  const cursor = decodeMailListCursor(options.cursor);

  const and: Prisma.MailMessageWhereInput[] = [folderWhere(folderKey)];

  if (label) and.push({ label });
  if (!q) {
    and.push({ parentId: null });
  }
  if (q) {
    and.push({
      OR: [
        { subject: { contains: q } },
        { fromName: { contains: q } },
        { fromEmail: { contains: q } },
        { preview: { contains: q } },
      ],
    });
  }
  if (cursor) {
    const receivedAt = new Date(cursor.receivedAt);
    if (!Number.isNaN(receivedAt.getTime())) {
      and.push({
        OR: [
          { receivedAt: { lt: receivedAt } },
          {
            AND: [{ receivedAt }, { id: { lt: cursor.id } }],
          },
        ],
      });
    }
  }

  return { AND: and };
}

export async function listMailMessagesPage(options: {
  folder?: string | null;
  label?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<MailListPage> {
  const limit = options.limit ?? MAIL_LIST_PAGE_SIZE;

  const rows = await prisma.mailMessage.findMany({
    where: buildMailListWhere(options),
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: MAIL_LIST_SELECT,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(toMailListSummaryItem),
    nextCursor: hasMore && last ? encodeMailListCursor(last) : null,
    hasMore,
  };
}

export async function listMailMessages(options: {
  folder?: string | null;
  label?: string | null;
  q?: string | null;
}): Promise<MailListItem[]> {
  const page = await listMailMessagesPage(options);
  return page.items;
}

function folderWhere(folderKey: MailFolderKey): Prisma.MailMessageWhereInput {
  const meta = MAIL_FOLDER_MAP[folderKey];
  if (meta.starredOnly) {
    return {
      isStarred: true,
      folder: { not: "TRASH" },
    };
  }
  return { folder: meta.folder };
}

export async function getMailFolderCounts(): Promise<MailFolderCounts> {
  const [inbox, sent, starred, draft, spam, trash, unreadInbox, labeled] =
    await Promise.all([
      prisma.mailMessage.count({ where: folderWhere("inbox") }),
      prisma.mailMessage.count({ where: folderWhere("sent") }),
      prisma.mailMessage.count({ where: folderWhere("starred") }),
      prisma.mailMessage.count({ where: folderWhere("draft") }),
      prisma.mailMessage.count({ where: folderWhere("spam") }),
      prisma.mailMessage.count({ where: folderWhere("trash") }),
      prisma.mailMessage.count({
        where: { folder: "INBOX", isRead: false },
      }),
      prisma.mailMessage.groupBy({
        by: ["label"],
        where: { label: { not: null }, folder: { not: "TRASH" } },
        _count: { _all: true },
      }),
    ]);

  const labels: Record<string, number> = {};
  for (const row of labeled) {
    if (row.label) labels[row.label] = row._count._all;
  }

  return {
    inbox,
    sent,
    starred,
    draft,
    spam,
    trash,
    unreadInbox,
    labels,
  };
}

export async function getMailMessageById(id: string) {
  const row = await prisma.mailMessage.findUnique({ where: { id } });
  return row ? toMailListItem(row) : null;
}

export type MailMessageDetail = {
  message: MailListItem;
  thread: MailListItem[];
  attachments: import("@/lib/mail-attachments").MailAttachmentView[];
};

export async function getMailMessageDetail(id: string): Promise<MailMessageDetail | null> {
  const { hydrateMailMessageBody } = await import("@/lib/mail-body-hydrate");
  const { collectThreadMessageIds, findThreadRootId } = await import("@/lib/mail-thread");
  const { toMailAttachmentView } = await import("@/lib/mail-attachments");

  const row = await prisma.mailMessage.findUnique({ where: { id } });
  if (!row) return null;

  const rootId = await findThreadRootId(id);
  const threadIds = await collectThreadMessageIds(rootId);

  await Promise.all(threadIds.map((threadId) => hydrateMailMessageBody(threadId)));

  const threadRows = await prisma.mailMessage.findMany({
    where: { id: { in: threadIds } },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });

  const attachmentRows = await prisma.mailAttachment.findMany({
    where: { messageId: { in: threadIds } },
    orderBy: { createdAt: "asc" },
  });

  const selectedRow = threadRows.find((item) => item.id === id) ?? row;

  return {
    message: toMailListItem(selectedRow),
    thread: threadRows.map(toMailListItem),
    attachments: attachmentRows.map(toMailAttachmentView),
  };
}

/** İlk açılışta boş kalmasın diye örnek iletişim mailleri */
export async function ensureDemoMailMessages() {
  const count = await prisma.mailMessage.count();
  if (count > 0) return;

  const now = Date.now();
  const samples = [
    {
      fromName: "Ayşe Demir",
      fromEmail: "ayse.demir@ornek.com",
      subject: "[İletişim Formu] Web sitesi yenileme teklifi",
      preview:
        "Merhaba, kurumsal web sitemizi yenilemek istiyoruz. Kısa bir görüşme ayarlayabilir miyiz?",
      bodyText:
        "Merhaba,\n\nKurumsal web sitemizi yenilemek istiyoruz. Mevcut sitemiz eski ve mobil uyumlu değil.\n\nSize uygun bir zamanda kısa bir görüşme ayarlayabilir miyiz?\n\nTeşekkürler,\nAyşe Demir",
      label: "contact",
      isRead: false,
      isStarred: true,
      minutesAgo: 35,
    },
    {
      fromName: "Mehmet Kaya",
      fromEmail: "mehmet@teknoloji.co",
      subject: "[İletişim Formu] E-ticaret entegrasyonu",
      preview:
        "Ödeme altyapısı ve stok entegrasyonu için proje kapsamı ve süre hakkında bilgi alabilir miyim?",
      bodyText:
        "Merhaba İhsan Bey,\n\nE-ticaret sitemize ödeme ve stok entegrasyonu eklemek istiyoruz.\nProje kapsamı, süre ve yaklaşık bütçe hakkında bilgi alabilir miyim?\n\nSaygılarımla,\nMehmet Kaya",
      label: "important",
      isRead: false,
      isStarred: false,
      minutesAgo: 120,
    },
    {
      fromName: "Zeynep Arslan",
      fromEmail: "zeynep.arslan@mail.com",
      subject: "[İletişim Formu] SEO ve içerik desteği",
      preview:
        "Blog ve hizmet sayfalarımız için SEO uyumlu içerik üretimi konusunda destek arıyoruz.",
      bodyText:
        "Merhaba,\n\nBlog ve hizmet sayfalarımız için SEO uyumlu içerik üretimi konusunda destek arıyoruz.\nReferanslarınızı inceledim, birlikte çalışmak isteriz.\n\nİyi günler,\nZeynep Arslan",
      label: "updates",
      isRead: true,
      isStarred: false,
      minutesAgo: 60 * 26,
    },
    {
      fromName: "Can Öztürk",
      fromEmail: "can@startup.io",
      subject: "[İletişim Formu] Landing page tasarımı",
      preview:
        "Yeni ürün lansmanı için tek sayfalık bir landing page ve form entegrasyonu istiyoruz.",
      bodyText:
        "Merhaba,\n\nYeni ürün lansmanı için tek sayfalık bir landing page ve form entegrasyonu istiyoruz.\nMümkünse bu hafta içinde dönüş alabilir miyiz?\n\nTeşekkürler,\nCan Öztürk",
      label: "personal",
      isRead: false,
      isStarred: false,
      hasAttachment: true,
      minutesAgo: 60 * 50,
    },
    {
      fromName: "Elif Yıldız",
      fromEmail: "elif@ajans.com",
      subject: "[İletişim Formu] Bakım anlaşması",
      preview:
        "Mevcut sitemiz için aylık bakım ve güvenlik güncellemesi paketi hakkında teklif istiyoruz.",
      bodyText:
        "Merhaba,\n\nMevcut sitemiz için aylık bakım ve güvenlik güncellemesi paketi hakkında teklif istiyoruz.\n\nDetayları paylaşabilirseniz sevinirim.\n\nElif Yıldız",
      label: "private",
      isRead: true,
      isStarred: false,
      minutesAgo: 60 * 80,
    },
  ] as const;

  await prisma.mailMessage.createMany({
    data: samples.map((item) => ({
      folder: "INBOX" as const,
      source: "CONTACT_FORM" as const,
      fromName: item.fromName,
      fromEmail: item.fromEmail,
      toEmail: "admin@ihsanakyildiz.com",
      replyToEmail: item.fromEmail,
      subject: item.subject,
      preview: item.preview,
      bodyText: item.bodyText,
      label: item.label,
      isRead: item.isRead,
      isStarred: item.isStarred,
      hasAttachment: "hasAttachment" in item ? Boolean(item.hasAttachment) : false,
      receivedAt: new Date(now - item.minutesAgo * 60_000),
    })),
  });
}
