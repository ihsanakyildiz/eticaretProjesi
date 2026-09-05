import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import {
  parseSupportChatAutoReplies,
  SUPPORT_CHAT_AUTO_REPLIES_KEY,
  type SupportChatAutoReplies,
} from "@/modules/support-chat/auto-replies";

export async function loadSupportChatAutoReplies(): Promise<SupportChatAutoReplies> {
  const map = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  return parseSupportChatAutoReplies(map[SUPPORT_CHAT_AUTO_REPLIES_KEY]);
}

export async function saveSupportChatAutoReplies(input: SupportChatAutoReplies) {
  const next = parseSupportChatAutoReplies(JSON.stringify(input));
  const value = JSON.stringify(next);
  await prisma.setting.upsert({
    where: { key: SUPPORT_CHAT_AUTO_REPLIES_KEY },
    update: { value, label: "Sohbet otomatik mesajlar", type: "json", group: "support_chat" },
    create: {
      key: SUPPORT_CHAT_AUTO_REPLIES_KEY,
      value,
      label: "Sohbet otomatik mesajlar",
      type: "json",
      group: "support_chat",
      sortOrder: 21,
    },
  });
  revalidateTag("settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/support/otomatik-mesajlar");
  return { ok: true as const, settings: next };
}
