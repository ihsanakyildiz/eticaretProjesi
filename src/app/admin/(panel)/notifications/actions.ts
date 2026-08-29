"use server";

import { requirePermission, requirePermissionOrThrow } from "@/lib/staff-permissions";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  collectThreadMessageIds,
  findThreadRootId,
} from "@/lib/mail-thread";
import {
  getMailNotifications,
  getUnreadMailNotificationCount,
  type MailNotificationItem,
} from "@/lib/mail-notifications";

export type MailNotificationsState = {
  items: MailNotificationItem[];
  unreadCount: number;
};

export async function fetchMailNotificationsAction(): Promise<MailNotificationsState> {
  const gate = await requirePermission("email", "view");
  if (!gate.ok) return { items: [], unreadCount: 0 };

  const [items, unreadCount] = await Promise.all([
    getMailNotifications(8),
    getUnreadMailNotificationCount(),
  ]);

  return { items, unreadCount };
}

export async function fetchUnreadNotificationCountAction(): Promise<number> {
  const gate = await requirePermission("email", "view");
  if (!gate.ok) return 0;
  return getUnreadMailNotificationCount();
}

export async function markMailNotificationReadAction(id: string) {
  await requirePermissionOrThrow("email", "update");
  const rootId = await findThreadRootId(id);
  const threadIds = await collectThreadMessageIds(rootId);

  await prisma.mailMessage.updateMany({
    where: { id: { in: threadIds } },
    data: { isRead: true },
  });
  revalidatePath("/admin/email");
  revalidatePath("/admin", "layout");
}

export async function markAllMailNotificationsReadAction() {
  await requirePermissionOrThrow("email", "update");
  await prisma.mailMessage.updateMany({
    where: { folder: "INBOX", isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/admin/email");
  revalidatePath("/admin", "layout");
}
