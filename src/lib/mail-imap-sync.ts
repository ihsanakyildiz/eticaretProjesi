import type { MailInboxConfig } from "@/lib/mail-inbox";
import {
  getImapConfigIssues,
  getMailInboxConfigFromSettings,
  isImapReady,
} from "@/lib/mail-inbox";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import {
  bumpThreadRootActivity,
  normalizeMailAddress,
  normalizeMailSubject,
} from "@/lib/mail-thread";

const SYNC_COOLDOWN_MS = 60_000;
const SYNC_TIMEOUT_MS = 20_000;
const MAX_SYNC_MESSAGES = 40;
const RECENT_LOOKBACK = 80;

let lastImapSyncAt = 0;
let syncInFlight: Promise<number> | null = null;

export type ImapSyncResult = {
  imported: number;
  skipped: boolean;
  timedOut?: boolean;
  error?: string;
};

type ParsedIncomingMail = {
  externalId: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  replyToEmail: string | null;
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
  inReplyTo: string | null;
  references: string[];
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<{ value: T; timedOut: boolean }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ value: fallback, timedOut: true }), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve({ value, timedOut: false });
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({ value: fallback, timedOut: false });
      });
  });
}

function matchesInboxFilter(
  mail: Pick<ParsedIncomingMail, "subject" | "toEmail">,
  inbox: MailInboxConfig,
): boolean {
  const subject = mail.subject;
  const to = mail.toEmail.toLowerCase();

  switch (inbox.filterMode) {
    case "contact_only": {
      const prefix = inbox.contactSubjectPrefix.trim();
      const tag = inbox.subjectFilter.trim();
      return Boolean(
        (prefix && subject.includes(prefix)) ||
          (tag && subject.includes(tag)),
      );
    }
    case "subject_contains":
      return Boolean(
        inbox.subjectFilter.trim() && subject.includes(inbox.subjectFilter.trim()),
      );
    case "to_address": {
      const filter = inbox.toFilter.trim().toLowerCase();
      return Boolean(filter && to.includes(filter));
    }
    case "all":
      return true;
    default: {
      const _exhaustive: never = inbox.filterMode;
      return _exhaustive;
    }
  }
}

function normalizeMessageId(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().replace(/^<|>$/g, "");
  return raw || null;
}

function parseReferences(value: string | null | undefined): string[] {
  if (!value) return [];
  const matches = value.match(/<[^>]+>/g);
  if (matches?.length) {
    return matches
      .map((item) => normalizeMessageId(item))
      .filter((item): item is string => Boolean(item));
  }
  return value
    .split(/\s+/)
    .map((item) => normalizeMessageId(item))
    .filter((item): item is string => Boolean(item));
}

function hasImapAttachments(
  structure: { disposition?: string; type?: string; childNodes?: unknown[] } | false | undefined,
): boolean {
  if (!structure) return false;
  if (structure.disposition?.toLowerCase() === "attachment") return true;
  if (structure.type && !["text", "multipart"].includes(structure.type.toLowerCase())) {
    return true;
  }
  if (Array.isArray(structure.childNodes)) {
    return structure.childNodes.some((child) =>
      hasImapAttachments(child as { disposition?: string; type?: string; childNodes?: unknown[] }),
    );
  }
  return false;
}

async function findByExternalId(externalId: string) {
  return prisma.mailMessage.findFirst({
    where: { externalId },
    select: { id: true, parentId: true },
    orderBy: { receivedAt: "desc" },
  });
}

async function resolveParentId(
  mail: Pick<
    ParsedIncomingMail,
    "fromEmail" | "subject" | "inReplyTo" | "references"
  >,
): Promise<string | null> {
  const candidateIds = [
    mail.inReplyTo,
    ...mail.references.slice().reverse(),
  ].filter((value): value is string => Boolean(value));

  for (const externalId of candidateIds) {
    const byExternal = await findByExternalId(externalId);
    if (byExternal) return byExternal.id;
  }

  const baseSubject = normalizeMailSubject(mail.subject);
  if (!baseSubject) return null;

  const fromEmail = normalizeMailAddress(mail.fromEmail);
  const subjectNeedle = baseSubject.slice(0, 120);

  const sentCandidates = await prisma.mailMessage.findMany({
    where: {
      folder: "SENT",
      subject: { contains: subjectNeedle },
    },
    select: { id: true, toEmail: true, receivedAt: true },
    orderBy: { receivedAt: "desc" },
    take: 20,
  });

  const sent = sentCandidates.find(
    (row) => normalizeMailAddress(row.toEmail) === fromEmail,
  );
  if (sent) return sent.id;

  const inboxCandidates = await prisma.mailMessage.findMany({
    where: {
      folder: "INBOX",
      subject: { contains: subjectNeedle },
      parentId: null,
    },
    select: { id: true, fromEmail: true, replyToEmail: true, receivedAt: true },
    orderBy: { receivedAt: "desc" },
    take: 20,
  });

  const inbox = inboxCandidates.find((row) => {
    const from = normalizeMailAddress(row.fromEmail);
    const replyTo = row.replyToEmail
      ? normalizeMailAddress(row.replyToEmail)
      : null;
    return from === fromEmail || replyTo === fromEmail;
  });

  return inbox?.id ?? null;
}

function parseFromEnvelope(
  envelope: {
    date?: Date;
    subject?: string;
    from?: { name?: string; address?: string }[];
    to?: { address?: string }[];
    messageId?: string;
    inReplyTo?: string;
  },
  uid: number,
  folder: string,
  referencesHeader?: string | null,
): ParsedIncomingMail | null {
  const from = envelope.from?.[0];
  const fromEmail = from?.address?.trim();
  if (!fromEmail) return null;

  const fromName =
    (from?.name ?? "").trim() ||
    fromEmail.split("@")[0] ||
    "Bilinmeyen";
  const subject = (envelope.subject ?? "(Konu yok)").trim();
  const toEmail = envelope.to?.[0]?.address ?? "";
  const messageId =
    normalizeMessageId(envelope.messageId ?? null) ??
    `imap:${folder}:${uid}`;

  return {
    externalId: messageId,
    fromName: fromName.slice(0, 191),
    fromEmail: fromEmail.slice(0, 191),
    toEmail: toEmail.slice(0, 191) || "inbox@local",
    replyToEmail: fromEmail.slice(0, 191),
    subject: subject.slice(0, 500),
    preview: subject.slice(0, 500),
    bodyText: "",
    bodyHtml: null,
    receivedAt: envelope.date ?? new Date(),
    inReplyTo: normalizeMessageId(envelope.inReplyTo ?? null),
    references: parseReferences(referencesHeader),
  };
}

/** Daha önce parent’sız düşmüş Re: mesajlarını yazışmaya bağlar */
export async function relinkOrphanMailReplies(limit = 50): Promise<number> {
  const orphans = await prisma.mailMessage.findMany({
    where: {
      folder: "INBOX",
      parentId: null,
      OR: [
        { subject: { startsWith: "Re:" } },
        { subject: { startsWith: "RE:" } },
        { subject: { startsWith: "re:" } },
        { subject: { startsWith: "Ynt:" } },
        { subject: { startsWith: "YNT:" } },
      ],
    },
    select: {
      id: true,
      fromEmail: true,
      subject: true,
      preview: true,
      receivedAt: true,
      externalId: true,
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  let linked = 0;

  for (const orphan of orphans) {
    const parentId = await resolveParentId({
      fromEmail: orphan.fromEmail,
      subject: orphan.subject,
      inReplyTo: null,
      references: [],
    });

    if (!parentId || parentId === orphan.id) continue;

    await prisma.mailMessage.update({
      where: { id: orphan.id },
      data: { parentId },
    });
    await bumpThreadRootActivity(parentId, {
      preview: orphan.preview,
      receivedAt: orphan.receivedAt,
      isRead: false,
    });
    linked += 1;
  }

  return linked;
}

function extractReferencesHeader(headers: unknown): string | null {
  if (!headers) return null;

  if (
    typeof headers === "object" &&
    headers !== null &&
    "get" in headers &&
    typeof (headers as { get: (key: string) => unknown }).get === "function"
  ) {
    const value = (headers as { get: (key: string) => unknown }).get("references");
    if (!value) return null;
    if (Buffer.isBuffer(value)) return value.toString("utf8");
    if (Array.isArray(value)) {
      return value
        .map((item) => (Buffer.isBuffer(item) ? item.toString("utf8") : String(item)))
        .join(" ");
    }
    return String(value);
  }

  if (Buffer.isBuffer(headers)) {
    const text = headers.toString("utf8");
    const match = text.match(/^references:\s*([\s\S]+?)(?=\r?\n\S|\r?\n\r?\n|$)/im);
    return match?.[1]?.replace(/\r?\n[ \t]+/g, " ").trim() ?? null;
  }

  return null;
}

async function importImapMessages(): Promise<{ imported: number }> {
  const settings = await getSettingsMapUncached();
  const inbox = getMailInboxConfigFromSettings(settings);
  const imap = inbox.imap;

  if (!isImapReady(imap) || getImapConfigIssues(imap).length > 0) {
    return { imported: 0 };
  }

  const { ImapFlow } = await import("imapflow");

  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: {
      user: imap.user,
      pass: imap.password,
    },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  let imported = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(imap.folder);
    try {
      const exists =
        typeof client.mailbox === "object" && client.mailbox
          ? Number(client.mailbox.exists || 0)
          : 0;
      const startSeq = Math.max(1, exists - RECENT_LOOKBACK + 1);
      const range = exists > 0 ? `${startSeq}:*` : "1:*";

      for await (const message of client.fetch(range, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        headers: ["references"],
      })) {
        if (imported >= MAX_SYNC_MESSAGES) break;
        if (!message.envelope) continue;

        const referencesHeader = extractReferencesHeader(message.headers);

        const parsed = parseFromEnvelope(
          message.envelope,
          message.uid,
          imap.folder,
          referencesHeader,
        );
        if (!parsed) continue;

        const existing = await prisma.mailMessage.findUnique({
          where: { externalId: parsed.externalId },
          select: { id: true, parentId: true },
        });
        if (existing) {
          if (!existing.parentId) {
            const parentId = await resolveParentId(parsed);
            if (parentId && parentId !== existing.id) {
              await prisma.mailMessage.update({
                where: { id: existing.id },
                data: { parentId },
              });
              await bumpThreadRootActivity(parentId, {
                preview: parsed.preview,
                receivedAt: parsed.receivedAt,
                isRead: false,
              });
            }
          }
          continue;
        }

        const parentId = await resolveParentId(parsed);
        const passesFilter = matchesInboxFilter(parsed, inbox);
        // Filtreye uymasa bile mevcut bir yazışmaya bağlanabiliyorsa içeri al
        if (!passesFilter && !parentId) continue;

        const isReply =
          Boolean(parentId) || /^re:\s*/i.test(parsed.subject.trim());
        const hasAttachment = hasImapAttachments(message.bodyStructure);

        await prisma.mailMessage.create({
          data: {
            folder: "INBOX",
            source: "IMAP",
            fromName: parsed.fromName,
            fromEmail: parsed.fromEmail,
            toEmail: parsed.toEmail,
            replyToEmail: parsed.replyToEmail,
            subject: parsed.subject,
            preview: parsed.preview,
            bodyText: parsed.preview,
            bodyHtml: null,
            isRead: false,
            isStarred: false,
            hasAttachment,
            label: isReply ? "important" : "contact",
            externalId: parsed.externalId,
            parentId,
            receivedAt: parsed.receivedAt,
          },
        });
        if (parentId) {
          await bumpThreadRootActivity(parentId, {
            preview: parsed.preview,
            receivedAt: parsed.receivedAt,
            isRead: false,
          });
        }
        imported += 1;
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("[imap-sync]", error);
  } finally {
    try {
      await client.logout();
    } catch {
      // Bağlantı zaten kapalı olabilir
    }
  }

  await relinkOrphanMailReplies();

  return { imported };
}

export async function syncImapInboxIfDue(
  force = false,
): Promise<ImapSyncResult> {
  const now = Date.now();
  if (!force && now - lastImapSyncAt < SYNC_COOLDOWN_MS) {
    return { imported: 0, skipped: true };
  }

  if (syncInFlight) {
    const imported = await syncInFlight;
    return { imported, skipped: false };
  }

  const run = async (): Promise<{ imported: number; timedOut?: boolean }> => {
    const { value, timedOut } = await withTimeout(
      importImapMessages(),
      SYNC_TIMEOUT_MS,
      { imported: 0 },
    );
    if (timedOut) {
      console.warn("[imap-sync] Zaman aşımı");
      return { imported: 0, timedOut: true };
    }
    return { imported: value.imported };
  };

  syncInFlight = run()
    .then((result) => result.imported)
    .finally(() => {
      syncInFlight = null;
      lastImapSyncAt = Date.now();
    });

  const imported = await syncInFlight;
  return { imported, skipped: false };
}

export async function syncImapInboxNow(): Promise<ImapSyncResult> {
  return syncImapInboxIfDue(true);
}
