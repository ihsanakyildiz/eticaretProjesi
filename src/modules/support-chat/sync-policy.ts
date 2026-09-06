export type SupportChatIngestOrigin = "live" | "history" | "local";

export const SUPPORT_CHAT_HISTORY_MAX_AGE_MS = 36 * 60 * 60 * 1000;
export const SUPPORT_CHAT_LIVE_CREATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SUPPORT_CHAT_HISTORY_WATERMARK_OVERLAP_MS = 5 * 60 * 1000;

export function supportChatMessageAgeMs(sentAt: Date, now = Date.now()) {
  return now - sentAt.getTime();
}

export function isSupportChatHistoryTooOld(sentAt: Date, now = Date.now()) {
  return supportChatMessageAgeMs(sentAt, now) > SUPPORT_CHAT_HISTORY_MAX_AGE_MS;
}

export function parseSupportChatExternalTime(value?: string | null) {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function canSupportChatAppendMessage(
  origin: SupportChatIngestOrigin,
  sentAt: Date,
  now = Date.now(),
) {
  switch (origin) {
    case "local":
      return true;
    case "history":
      return !isSupportChatHistoryTooOld(sentAt, now);
    case "live":
      return supportChatMessageAgeMs(sentAt, now) <= SUPPORT_CHAT_LIVE_CREATE_MAX_AGE_MS;
    default: {
      const _never: never = origin;
      return _never;
    }
  }
}

export function canSupportChatCreateConversation(
  origin: SupportChatIngestOrigin,
  sentAt: Date,
  now = Date.now(),
) {
  switch (origin) {
    case "local":
      return true;
    case "history":
      return !isSupportChatHistoryTooOld(sentAt, now);
    case "live":
      return supportChatMessageAgeMs(sentAt, now) <= SUPPORT_CHAT_LIVE_CREATE_MAX_AGE_MS;
    default: {
      const _never: never = origin;
      return _never;
    }
  }
}

export function canSupportChatReopenBlockedThread(
  origin: SupportChatIngestOrigin,
  sentAt: Date,
  blockedAt: Date | null,
  now = Date.now(),
) {
  if (blockedAt && sentAt.getTime() <= blockedAt.getTime()) return false;
  switch (origin) {
    case "local":
      return true;
    case "history":
      return !isSupportChatHistoryTooOld(sentAt, now);
    case "live":
      return supportChatMessageAgeMs(sentAt, now) <= SUPPORT_CHAT_LIVE_CREATE_MAX_AGE_MS;
    default: {
      const _never: never = origin;
      return _never;
    }
  }
}

export function canSupportChatHistoryOpenThread(newestSentAt: Date | null, blockedAt: Date | null) {
  if (!newestSentAt) return false;
  return canSupportChatReopenBlockedThread("history", newestSentAt, blockedAt);
}

export function isSupportChatBeforeHistoryWatermark(sentAt: Date, watermark: Date | null) {
  if (!watermark) return false;
  return sentAt.getTime() <= watermark.getTime() - SUPPORT_CHAT_HISTORY_WATERMARK_OVERLAP_MS;
}
