import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import {
  parseWebChatAppearance,
  WEB_CHAT_APPEARANCE_DEFAULTS,
  isWebChatIcon,
  isWebChatPosition,
  type WebChatAppearance,
} from "@/modules/support-chat/web-chat-appearance";

const SETTING_META: Array<{
  key: keyof typeof KEYS;
  label: string;
  type: string;
  sortOrder: number;
}> = [
  { key: "enabled", label: "Web sohbet aktif", type: "boolean", sortOrder: 0 },
  { key: "membership", label: "Web sohbet üyelik formu", type: "boolean", sortOrder: 1 },
  { key: "attachments", label: "Web sohbet dosya yükleme", type: "boolean", sortOrder: 2 },
  { key: "icon", label: "Web sohbet ikonu", type: "text", sortOrder: 3 },
  { key: "teaser", label: "Web sohbet balonu", type: "boolean", sortOrder: 4 },
  { key: "teaser_text", label: "Web sohbet balon metni", type: "text", sortOrder: 5 },
  { key: "teaser_guest_text", label: "Web sohbet misafir balon metni", type: "text", sortOrder: 6 },
  { key: "agent_name", label: "Web sohbet temsilci adı", type: "boolean", sortOrder: 7 },
  { key: "greeting", label: "Web sohbet karşılama", type: "textarea", sortOrder: 8 },
  { key: "position", label: "Web sohbet konumu", type: "text", sortOrder: 9 },
];

const KEYS = {
  enabled: "support_chat_web_enabled",
  membership: "support_chat_web_membership",
  attachments: "support_chat_web_attachments",
  icon: "support_chat_web_icon",
  teaser: "support_chat_web_teaser",
  teaser_text: "support_chat_web_teaser_text",
  teaser_guest_text: "support_chat_web_teaser_guest_text",
  agent_name: "support_chat_web_agent_name",
  greeting: "support_chat_web_greeting",
  position: "support_chat_web_position",
} as const;

export async function loadWebChatAppearance(): Promise<WebChatAppearance> {
  const map = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  return parseWebChatAppearance(map);
}

export async function saveWebChatAppearance(input: Partial<WebChatAppearance> & {
  enabled: boolean;
  membership: boolean;
  attachmentsEnabled: boolean;
  teaserEnabled: boolean;
  showAgentName: boolean;
}) {
  const next: WebChatAppearance = {
    enabled: input.enabled,
    membership: input.membership,
    attachmentsEnabled: input.attachmentsEnabled,
    icon: input.icon && isWebChatIcon(input.icon) ? input.icon : WEB_CHAT_APPEARANCE_DEFAULTS.icon,
    teaserEnabled: input.teaserEnabled,
    teaserText: (input.teaserText ?? "").trim().slice(0, 180) || WEB_CHAT_APPEARANCE_DEFAULTS.teaserText,
    teaserGuestText:
      (input.teaserGuestText ?? "").trim().slice(0, 180) || WEB_CHAT_APPEARANCE_DEFAULTS.teaserGuestText,
    showAgentName: input.showAgentName,
    greeting: (input.greeting ?? "").trim().slice(0, 500) || WEB_CHAT_APPEARANCE_DEFAULTS.greeting,
    position:
      input.position && isWebChatPosition(input.position)
        ? input.position
        : WEB_CHAT_APPEARANCE_DEFAULTS.position,
  };

  const values: Record<(typeof SETTING_META)[number]["key"], string> = {
    enabled: next.enabled ? "true" : "false",
    membership: next.membership ? "true" : "false",
    attachments: next.attachmentsEnabled ? "true" : "false",
    icon: next.icon,
    teaser: next.teaserEnabled ? "true" : "false",
    teaser_text: next.teaserText,
    teaser_guest_text: next.teaserGuestText,
    agent_name: next.showAgentName ? "true" : "false",
    greeting: next.greeting,
    position: next.position,
  };

  for (const field of SETTING_META) {
    const key = KEYS[field.key];
    const value = values[field.key];
    await prisma.setting.upsert({
      where: { key },
      update: { value, label: field.label, type: field.type, group: "support_chat" },
      create: {
        key,
        value,
        label: field.label,
        type: field.type,
        group: "support_chat",
        sortOrder: field.sortOrder,
      },
    });
  }

  revalidateTag("settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/support/web");
  return { ok: true as const, appearance: next };
}
