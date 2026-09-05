export const WEB_CHAT_ICONS = [
  "message",
  "messages",
  "headset",
  "help",
  "sparkles",
  "heart",
  "bot",
  "lifebuoy",
] as const;

export type WebChatIcon = (typeof WEB_CHAT_ICONS)[number];
export type WebChatPosition = "right" | "left";

export type WebChatAppearance = {
  enabled: boolean;
  membership: boolean;
  icon: WebChatIcon;
  teaserEnabled: boolean;
  teaserText: string;
  teaserGuestText: string;
  showAgentName: boolean;
  greeting: string;
  position: WebChatPosition;
};

export const WEB_CHAT_APPEARANCE_DEFAULTS: WebChatAppearance = {
  enabled: true,
  membership: true,
  icon: "message",
  teaserEnabled: true,
  teaserText: "Sipariş veya kargo için yardıma mı ihtiyacınız var?",
  teaserGuestText: "Sipariş veya kargo için yardıma mı ihtiyacınız var?",
  showAgentName: true,
  greeting: "Merhaba! Sipariş, kargo veya ürün hakkında yazabilirsiniz. Size yardımcı olalım.",
  position: "right",
};

export const WEB_CHAT_ICON_LABELS: Record<WebChatIcon, string> = {
  message: "Konuşma",
  messages: "Mesajlar",
  headset: "Kulaklık",
  help: "Yardım",
  sparkles: "Parıltı",
  heart: "Kalp",
  bot: "Asistan",
  lifebuoy: "Destek",
};

export function isWebChatIcon(value: string): value is WebChatIcon {
  return (WEB_CHAT_ICONS as readonly string[]).includes(value);
}

export function isWebChatPosition(value: string): value is WebChatPosition {
  return value === "right" || value === "left";
}

export function parseWebChatAppearance(map: Record<string, string>): WebChatAppearance {
  const flag = (key: string, fallback: boolean) => {
    const value = map[key];
    if (value === undefined || value === "") return fallback;
    return value === "true" || value === "1" || value === "on";
  };
  const icon = map.support_chat_web_icon ?? "";
  const position = map.support_chat_web_position ?? "";
  return {
    enabled: flag("support_chat_web_enabled", WEB_CHAT_APPEARANCE_DEFAULTS.enabled),
    membership: flag("support_chat_web_membership", WEB_CHAT_APPEARANCE_DEFAULTS.membership),
    icon: isWebChatIcon(icon) ? icon : WEB_CHAT_APPEARANCE_DEFAULTS.icon,
    teaserEnabled: flag("support_chat_web_teaser", WEB_CHAT_APPEARANCE_DEFAULTS.teaserEnabled),
    teaserText:
      map.support_chat_web_teaser_text?.trim() || WEB_CHAT_APPEARANCE_DEFAULTS.teaserText,
    teaserGuestText:
      map.support_chat_web_teaser_guest_text?.trim() ||
      map.support_chat_web_teaser_text?.trim() ||
      WEB_CHAT_APPEARANCE_DEFAULTS.teaserGuestText,
    showAgentName: flag("support_chat_web_agent_name", WEB_CHAT_APPEARANCE_DEFAULTS.showAgentName),
    greeting:
      map.support_chat_web_greeting?.trim() || WEB_CHAT_APPEARANCE_DEFAULTS.greeting,
    position: isWebChatPosition(position) ? position : WEB_CHAT_APPEARANCE_DEFAULTS.position,
  };
}
