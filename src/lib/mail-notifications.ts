import type { MailMessage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MailNotificationType = "new" | "reply";

export type MailNotificationItem = {
  id: string;
  type: MailNotificationType;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  receivedAt: string;
  href: string;
};

export function resolveMailNotificationType(
  row: Pick<MailMessage, "parentId" | "subject">,
): MailNotificationType {
  if (row.parentId) return "reply";
  if (/^re:\s*/i.test(row.subject.trim())) return "reply";
  return "new";
}

export function toMailNotificationItem(row: MailMessage): MailNotificationItem {
  const type = resolveMailNotificationType(row);
  return {
    id: row.id,
    type,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    preview: row.preview,
    receivedAt: row.receivedAt.toISOString(),
    href: `/admin/email?id=${row.id}`,
  };
}

export async function getUnreadMailNotificationCount(): Promise<number> {
  return prisma.mailMessage.count({
    where: { folder: "INBOX", isRead: false, parentId: null },
  });
}

export async function getMailNotifications(
  limit = 8,
): Promise<MailNotificationItem[]> {
  const rows = await prisma.mailMessage.findMany({
    where: { folder: "INBOX", isRead: false, parentId: null },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  return rows.map(toMailNotificationItem);
}
