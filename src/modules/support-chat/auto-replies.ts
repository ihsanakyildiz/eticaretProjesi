import { isSupportChatOnline, type SupportChatWorkingHours } from "@/modules/support-chat/working-hours";

export const SUPPORT_CHAT_AUTO_REPLIES_KEY = "support_chat_auto_replies";

export type SupportChatAutoReplyKind = "vacation" | "hours" | "welcome";

export type SupportChatAutoReplyBlock = {
  enabled: boolean;
  message: string;
};

export type SupportChatVacationBlock = SupportChatAutoReplyBlock & {
  messageEnabled: boolean;
};

export type SupportChatAutoReplies = {
  vacation: SupportChatVacationBlock;
  hours: SupportChatAutoReplyBlock;
  welcome: SupportChatAutoReplyBlock;
};

export const SUPPORT_CHAT_AUTO_REPLIES_DEFAULTS: SupportChatAutoReplies = {
  vacation: {
    enabled: false,
    messageEnabled: true,
    message:
      "Şu anda tatildeyiz. Mesajınızı aldık, döndüğümüzde size en kısa sürede dönüş yapacağız.",
  },
  hours: {
    enabled: false,
    message: "Mesai saatlerimiz dışındayız. Mesajınızı aldık, çalışma saatlerimizde size dönüş yapacağız.",
  },
  welcome: {
    enabled: false,
    message: "Merhaba! Size nasıl yardımcı olabiliriz?",
  },
};

const MESSAGE_MAX = 2000;

function normalizeMessage(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MESSAGE_MAX) : fallback;
}

function parseBlock(raw: unknown, fallback: SupportChatAutoReplyBlock): SupportChatAutoReplyBlock {
  if (!raw || typeof raw !== "object") return fallback;
  const rec = raw as Record<string, unknown>;
  return {
    enabled: Boolean(rec.enabled),
    message: normalizeMessage(rec.message, fallback.message),
  };
}

function parseVacationBlock(raw: unknown, fallback: SupportChatVacationBlock): SupportChatVacationBlock {
  const block = parseBlock(raw, fallback);
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return {
    ...block,
    messageEnabled: Boolean(rec?.messageEnabled),
  };
}

export function parseSupportChatAutoReplies(raw: string | null | undefined): SupportChatAutoReplies {
  const fallback = SUPPORT_CHAT_AUTO_REPLIES_DEFAULTS;
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SupportChatAutoReplies>;
    return {
      vacation: parseVacationBlock(parsed.vacation, fallback.vacation),
      hours: parseBlock(parsed.hours, fallback.hours),
      welcome: parseBlock(parsed.welcome, fallback.welcome),
    };
  } catch {
    return fallback;
  }
}

export function isSupportChatVacationMode(settings: SupportChatAutoReplies) {
  return settings.vacation.enabled;
}

export function supportChatWidgetPresence(
  hours: SupportChatWorkingHours,
  autoReplies: SupportChatAutoReplies,
) {
  const vacation = isSupportChatVacationMode(autoReplies);
  const scheduleOnline = isSupportChatOnline(hours);
  const online = !vacation && scheduleOnline;
  return { vacation, scheduleOnline, online };
}

export function pickSupportChatAutoReply(
  settings: SupportChatAutoReplies,
  hours: SupportChatWorkingHours,
  at = new Date(),
): { kind: SupportChatAutoReplyKind; body: string } | null {
  if (isSupportChatVacationMode(settings)) {
    const body = settings.vacation.message.trim();
    return settings.vacation.messageEnabled && body ? { kind: "vacation", body } : null;
  }
  if (!isSupportChatOnline(hours, at)) {
    const body = settings.hours.message.trim();
    return settings.hours.enabled && body ? { kind: "hours", body } : null;
  }
  const body = settings.welcome.message.trim();
  return settings.welcome.enabled && body ? { kind: "welcome", body } : null;
}

export function supportChatAutoReplyExternalId(
  kind: SupportChatAutoReplyKind,
  conversationId: string,
  at = new Date(),
) {
  switch (kind) {
    case "vacation":
      return `auto:vacation:${conversationId}`;
    case "welcome":
      return `auto:welcome:${conversationId}`;
    case "hours": {
      const day = at.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
      return `auto:hours:${conversationId}:${day}`;
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
