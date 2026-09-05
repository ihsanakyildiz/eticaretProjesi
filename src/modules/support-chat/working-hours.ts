export const SUPPORT_CHAT_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export type SupportChatWeekday = (typeof SUPPORT_CHAT_WEEKDAY_ORDER)[number];

export type SupportChatDayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type SupportChatWorkingHours = {
  timezone: string;
  days: Record<SupportChatWeekday, SupportChatDayHours>;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIMEZONE = "Europe/Istanbul";

export const SUPPORT_CHAT_WEEKDAY_LABELS: Record<SupportChatWeekday, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  0: "Pazar",
};

const SHORT_LABELS: Record<SupportChatWeekday, string> = {
  1: "Pzt",
  2: "Sal",
  3: "Çar",
  4: "Per",
  5: "Cum",
  6: "Cmt",
  0: "Paz",
};

function weekdayHours(enabled: boolean, start = "09:00", end = "18:00"): SupportChatDayHours {
  return { enabled, start, end };
}

export const SUPPORT_CHAT_WORKING_HOURS_DEFAULTS: SupportChatWorkingHours = {
  timezone: TIMEZONE,
  days: {
    1: weekdayHours(true),
    2: weekdayHours(true),
    3: weekdayHours(true),
    4: weekdayHours(true),
    5: weekdayHours(true),
    6: weekdayHours(false),
    0: weekdayHours(false),
  },
};

function isWeekday(value: number): value is SupportChatWeekday {
  return value >= 0 && value <= 6;
}

function normalizeTime(value: string, fallback: string) {
  const trimmed = value.trim();
  return TIME_RE.test(trimmed) ? trimmed : fallback;
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

export function parseSupportChatWorkingHours(raw: string | null | undefined): SupportChatWorkingHours {
  const fallback = SUPPORT_CHAT_WORKING_HOURS_DEFAULTS;
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SupportChatWorkingHours>;
    const days = { ...fallback.days };
    const rawDays = parsed.days as Record<string, SupportChatDayHours> | undefined;
    for (const key of SUPPORT_CHAT_WEEKDAY_ORDER) {
      const row = rawDays?.[String(key)];
      if (!row) continue;
      days[key] = {
        enabled: Boolean(row.enabled),
        start: normalizeTime(String(row.start ?? ""), fallback.days[key].start),
        end: normalizeTime(String(row.end ?? ""), fallback.days[key].end),
      };
    }
    return { timezone: TIMEZONE, days };
  } catch {
    return fallback;
  }
}

export function formatSupportChatWorkingHours(hours: SupportChatWorkingHours) {
  const openDays = SUPPORT_CHAT_WEEKDAY_ORDER.filter((day) => hours.days[day].enabled);
  if (openDays.length === 0) return "Çalışma saati tanımlı değil";

  const groups: Array<{ startDay: SupportChatWeekday; endDay: SupportChatWeekday; start: string; end: string }> =
    [];
  for (const day of openDays) {
    const current = hours.days[day];
    const last = groups[groups.length - 1];
    const previous = last
      ? SUPPORT_CHAT_WEEKDAY_ORDER[SUPPORT_CHAT_WEEKDAY_ORDER.indexOf(last.endDay) + 1]
      : null;
    if (last && previous === day && last.start === current.start && last.end === current.end) {
      last.endDay = day;
      continue;
    }
    groups.push({ startDay: day, endDay: day, start: current.start, end: current.end });
  }

  return groups
    .map((group) => {
      const range =
        group.startDay === group.endDay
          ? SHORT_LABELS[group.startDay]
          : `${SHORT_LABELS[group.startDay]}–${SHORT_LABELS[group.endDay]}`;
      return `${range} ${group.start}–${group.end}`;
    })
    .join(" · ");
}

export function isSupportChatOnline(hours: SupportChatWorkingHours, at = new Date()) {
  const text = at.toLocaleString("sv-SE", { timeZone: TIMEZONE });
  const local = new Date(text.replace(" ", "T"));
  const day = local.getDay();
  if (!isWeekday(day)) return false;
  const slot = hours.days[day];
  if (!slot.enabled) return false;
  const now = local.getHours() * 60 + local.getMinutes();
  const start = minutesOf(slot.start);
  const end = minutesOf(slot.end);
  if (end <= start) return now >= start || now < end;
  return now >= start && now < end;
}

export function supportChatHoursStatus(hours: SupportChatWorkingHours) {
  const label = formatSupportChatWorkingHours(hours);
  const online = isSupportChatOnline(hours);
  return {
    label,
    online,
    subtitle: online ? label : `Kapalı · ${label}`,
  };
}
