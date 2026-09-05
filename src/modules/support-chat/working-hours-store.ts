import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import {
  parseSupportChatWorkingHours,
  SUPPORT_CHAT_WORKING_HOURS_DEFAULTS,
  SUPPORT_CHAT_WEEKDAY_ORDER,
  type SupportChatWorkingHours,
} from "@/modules/support-chat/working-hours";

const SETTING_KEY = "support_chat_working_hours";

export async function loadSupportChatWorkingHours(): Promise<SupportChatWorkingHours> {
  const map = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  return parseSupportChatWorkingHours(map[SETTING_KEY]);
}

export async function saveSupportChatWorkingHours(hours: SupportChatWorkingHours) {
  const next: SupportChatWorkingHours = {
    timezone: SUPPORT_CHAT_WORKING_HOURS_DEFAULTS.timezone,
    days: { ...SUPPORT_CHAT_WORKING_HOURS_DEFAULTS.days },
  };
  for (const day of SUPPORT_CHAT_WEEKDAY_ORDER) {
    const row = hours.days[day];
    next.days[day] = {
      enabled: Boolean(row?.enabled),
      start: row?.start || "09:00",
      end: row?.end || "18:00",
    };
  }

  const value = JSON.stringify(next);
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value, label: "Sohbet çalışma saatleri", type: "json", group: "support_chat" },
    create: {
      key: SETTING_KEY,
      value,
      label: "Sohbet çalışma saatleri",
      type: "json",
      group: "support_chat",
      sortOrder: 20,
    },
  });
  revalidateTag("settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/support/ayarlar");
  return { ok: true as const, hours: next };
}
