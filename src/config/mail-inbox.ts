export type MailInboxFilterMode =
  | "contact_only"
  | "subject_contains"
  | "to_address"
  | "all";

const FILTER_MODES: MailInboxFilterMode[] = [
  "contact_only",
  "subject_contains",
  "to_address",
  "all",
];

export function resolveMailInboxFilterMode(
  raw: string | null | undefined,
): MailInboxFilterMode {
  const value = String(raw ?? "").trim() as MailInboxFilterMode;
  return FILTER_MODES.includes(value) ? value : "contact_only";
}

export function parseMailPort(raw: string | undefined, fallback: number) {
  const port = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return fallback;
  return port;
}
