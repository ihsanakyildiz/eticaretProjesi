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

export function supportChatCutoffMs(value: Date | number | string | bigint | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const ms = Number(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 1_000_000_000_000) return numeric;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }
  return null;
}

export function isSupportChatBeforeThreadCutoff(sentAt: Date, cutoffMs: number | null) {
  if (cutoffMs == null) return false;
  return sentAt.getTime() <= cutoffMs;
}

export function isSupportChatBeforeHistoryWatermark(sentAt: Date, watermark: Date | null) {
  if (!watermark) return false;
  return sentAt.getTime() <= watermark.getTime() - SUPPORT_CHAT_HISTORY_WATERMARK_OVERLAP_MS;
}
