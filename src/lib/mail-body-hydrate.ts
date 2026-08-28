import { simpleParser, type Attachment } from "mailparser";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import {
  getImapConfigIssues,
  getMailInboxConfigFromSettings,
  isImapReady,
} from "@/lib/mail-inbox";
import {
  replaceCidReferences,
  saveMailAttachmentBuffer,
  type SavedMailAttachment,
} from "@/lib/mail-attachments";

const HYDRATE_TIMEOUT_MS = 12_000;

function normalizeMessageId(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().replace(/^<|>$/g, "");
  return raw || null;
}

function parseImapUid(externalId: string | null): number | null {
  if (!externalId?.startsWith("imap:")) return null;
  const parts = externalId.split(":");
  const uid = Number(parts[parts.length - 1]);
  return Number.isFinite(uid) ? uid : null;
}

function sourceFromFetchResult(message: unknown): Buffer | null {
  if (!message || typeof message !== "object" || !("source" in message)) return null;
  const source = (message as { source?: Buffer | Uint8Array | string }).source;
  if (!source) return null;
  return Buffer.isBuffer(source) ? source : Buffer.from(source);
}

async function downloadImapSource(externalId: string | null): Promise<Buffer | null> {
  const settings = await getSettingsMapUncached();
  const inbox = getMailInboxConfigFromSettings(settings);
  const imap = inbox.imap;

  if (!isImapReady(imap) || getImapConfigIssues(imap).length > 0) {
    return null;
  }

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: { user: imap.user, pass: imap.password },
    logger: false,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 8_000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(imap.folder);
    try {
      const uid = parseImapUid(externalId);
      if (uid) {
        const message = await client.fetchOne(uid, { source: true }, { uid: true });
        const source = sourceFromFetchResult(message);
        if (source) return source;
      }

      const messageId = normalizeMessageId(externalId);
      if (messageId) {
        const search = await client.search({
          header: { "message-id": messageId },
        });
        const searchUids = Array.isArray(search) ? search : [];
        const targetUid = searchUids[0];
        if (targetUid) {
          const message = await client.fetchOne(targetUid, { source: true }, { uid: true });
          const source = sourceFromFetchResult(message);
          if (source) return source;
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("[mail-hydrate-imap]", error);
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }

  return null;
}

async function attachmentToSaved(
  messageId: string,
  attachment: Attachment,
): Promise<SavedMailAttachment | null> {
  const content = attachment.content;
  if (!content || content.length === 0) return null;

  return saveMailAttachmentBuffer(messageId, {
    filename: attachment.filename || "attachment",
    mimeType: attachment.contentType || "application/octet-stream",
    content: Buffer.isBuffer(content) ? content : Buffer.from(content),
    contentId: attachment.cid || attachment.contentId || null,
    isInline: Boolean(attachment.related || attachment.contentDisposition === "inline"),
  });
}

export async function hydrateMailMessageBody(messageId: string): Promise<boolean> {
  const message = await prisma.mailMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      source: true,
      externalId: true,
      bodyHtml: true,
      bodyText: true,
      preview: true,
      _count: { select: { attachments: true } },
    },
  });

  if (!message) return false;

  const needsBody =
    message.source === "IMAP" &&
    !message.bodyHtml &&
    (!message.bodyText || message.bodyText === message.preview);
  const needsAttachments = message._count.attachments === 0;

  if (!needsBody && !needsAttachments) return false;

  const sourceBuffer = await Promise.race([
    downloadImapSource(message.externalId),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), HYDRATE_TIMEOUT_MS)),
  ]);

  if (!sourceBuffer) return false;

  const parsed = await simpleParser(sourceBuffer);
  const savedAttachments: SavedMailAttachment[] = [];

  for (const attachment of parsed.attachments ?? []) {
    const saved = await attachmentToSaved(message.id, attachment);
    if (saved) savedAttachments.push(saved);
  }

  const bodyText = (parsed.text || parsed.textAsHtml || message.preview || "").trim();
  let bodyHtml = parsed.html ? String(parsed.html) : null;
  if (bodyHtml && savedAttachments.length > 0) {
    bodyHtml = replaceCidReferences(bodyHtml, savedAttachments);
  }

  const preview = (bodyText || parsed.subject || message.preview || "")
    .replace(/\s+/g, " ")
    .slice(0, 500);

  await prisma.$transaction(async (tx) => {
    if (needsAttachments && savedAttachments.length > 0) {
      const existing = await tx.mailAttachment.count({
        where: { messageId: message.id },
      });
      if (existing === 0) {
        await tx.mailAttachment.createMany({
          data: savedAttachments.map((item) => ({
            messageId: message.id,
            filename: item.filename,
            mimeType: item.mimeType,
            size: item.size,
            contentId: item.contentId,
            isInline: item.isInline,
            storagePath: item.storagePath,
          })),
        });
      }
    }

    await tx.mailMessage.update({
      where: { id: message.id },
      data: {
        bodyText: bodyText || message.preview,
        bodyHtml,
        preview,
        hasAttachment: savedAttachments.length > 0 || message._count.attachments > 0,
      },
    });
  });

  return true;
}
