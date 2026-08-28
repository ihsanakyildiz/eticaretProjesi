import { prisma } from "@/lib/prisma";

export async function findThreadRootId(messageId: string): Promise<string> {
  let currentId = messageId;

  for (let depth = 0; depth < 32; depth += 1) {
    const row = await prisma.mailMessage.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true },
    });
    if (!row?.parentId) return row?.id ?? messageId;
    currentId = row.parentId;
  }

  return currentId;
}

export async function collectThreadMessageIds(rootId: string): Promise<string[]> {
  const ids = new Set<string>([rootId]);
  let frontier = [rootId];

  for (let depth = 0; depth < 32 && frontier.length > 0; depth += 1) {
    const children = await prisma.mailMessage.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        frontier.push(child.id);
      }
    }
  }

  return [...ids];
}

export async function bumpThreadRootActivity(
  messageId: string,
  update: {
    preview: string;
    receivedAt?: Date;
    isRead?: boolean;
  },
) {
  const rootId = await findThreadRootId(messageId);
  await prisma.mailMessage.update({
    where: { id: rootId },
    data: {
      preview: update.preview.slice(0, 500),
      ...(update.receivedAt ? { receivedAt: update.receivedAt } : {}),
      ...(typeof update.isRead === "boolean" ? { isRead: update.isRead } : {}),
    },
  });
}

/** Re:/Fwd:/Ynt: öneklerini temizleyip karşılaştırılabilir konu üretir */
export function normalizeMailSubject(subject: string): string {
  let value = subject.trim();
  for (let i = 0; i < 8; i += 1) {
    const next = value
      .replace(/^(re|fw|fwd|ynt|cevap|yanıt|yanit)\s*:\s*/i, "")
      .trim();
    if (next === value) break;
    value = next;
  }
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMailAddress(email: string): string {
  return email.trim().toLowerCase();
}

/** Thread’deki Message-ID zincirini SMTP References başlığı için üretir */
export async function buildThreadReferences(
  messageId: string,
): Promise<{ inReplyTo: string | null; references: string | null }> {
  const rootId = await findThreadRootId(messageId);
  const threadIds = await collectThreadMessageIds(rootId);
  const rows = await prisma.mailMessage.findMany({
    where: {
      id: { in: threadIds },
      externalId: { not: null },
    },
    select: { id: true, externalId: true, receivedAt: true },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });

  const ids = rows
    .map((row) => row.externalId)
    .filter((value): value is string => Boolean(value));

  const parent = rows.find((row) => row.id === messageId);
  const inReplyTo = parent?.externalId ?? ids[ids.length - 1] ?? null;
  const references = ids.length > 0 ? ids.join(" ") : inReplyTo;

  return { inReplyTo, references };
}
