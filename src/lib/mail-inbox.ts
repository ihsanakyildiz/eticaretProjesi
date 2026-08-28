import { isSettingEnabled } from "@/lib/settings";
import {
  getSmtpProviderPreset,
  resolveSmtpProviderId,
} from "@/config/smtp-providers";
import {
  parseMailPort,
  resolveMailInboxFilterMode,
  type MailInboxFilterMode,
} from "@/config/mail-inbox";

export type { MailInboxFilterMode };
export { resolveMailInboxFilterMode };

export type ImapConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  folder: string;
  sameAsSmtp: boolean;
};

export type MailInboxConfig = {
  /** İletişim formu mesajlarını admin paneline kaydet */
  storeContactMessages: boolean;
  /** IMAP ile posta kutusundan çek */
  imap: ImapConfig;
  /** IMAP çekiminde hangi mailler gelsin */
  filterMode: MailInboxFilterMode;
  /** Konu satırında aranan metin (subject_contains / contact tag) */
  subjectFilter: string;
  /** Yalnızca bu alıcıya gelenler (to_address) */
  toFilter: string;
  /** İletişim formu bildirimlerinde kullanılacak konu öneki */
  contactSubjectPrefix: string;
};

export function getImapConfigFromSettings(settings: Record<string, string>): ImapConfig {
  const provider = resolveSmtpProviderId(settings.smtp_provider);
  const preset = getSmtpProviderPreset(provider);
  const sameAsSmtp = isSettingEnabled(settings, "imap_same_as_smtp", true);

  const host =
    (settings.imap_host ?? "").trim() ||
    preset.imapHost ||
    (sameAsSmtp ? (settings.smtp_host ?? "").trim() || preset.host : "");

  const port = parseMailPort(settings.imap_port, preset.imapPort ?? 993);

  const secureExplicit = isSettingEnabled(settings, "imap_secure", true);
  const secure =
    settings.imap_secure === "false" || settings.imap_secure === "0"
      ? false
      : secureExplicit || port === 993 || Boolean(preset.imapSecure);

  const user = sameAsSmtp
    ? (settings.smtp_user ?? "").trim() || (settings.imap_user ?? "").trim()
    : (settings.imap_user ?? "").trim() || (settings.smtp_user ?? "").trim();

  const password = sameAsSmtp
    ? settings.smtp_password || settings.imap_password || ""
    : settings.imap_password || settings.smtp_password || "";

  return {
    enabled: isSettingEnabled(settings, "imap_enabled", false),
    host,
    port,
    secure,
    user,
    password,
    folder: (settings.imap_folder ?? "").trim() || "INBOX",
    sameAsSmtp,
  };
}

export function getMailInboxConfigFromSettings(
  settings: Record<string, string>,
): MailInboxConfig {
  return {
    storeContactMessages: isSettingEnabled(settings, "mail_store_contact_messages", true),
    imap: getImapConfigFromSettings(settings),
    filterMode: resolveMailInboxFilterMode(settings.mail_inbox_filter_mode),
    subjectFilter: (settings.mail_inbox_subject_filter ?? "").trim() || "[İletişim]",
    toFilter: (settings.mail_inbox_to_filter ?? "").trim(),
    contactSubjectPrefix:
      (settings.mail_contact_subject_prefix ?? "").trim() || "[İletişim Formu]",
  };
}

export function getImapConfigIssues(config: ImapConfig): string[] {
  const issues: string[] = [];
  if (!config.enabled) {
    issues.push("IMAP gelen kutu kapalı.");
    return issues;
  }
  if (!config.host) issues.push("IMAP host boş.");
  if (!config.user) issues.push("IMAP kullanıcı adı boş.");
  if (!config.password) issues.push("IMAP şifresi boş.");
  if (!config.folder) issues.push("IMAP klasörü boş.");
  return issues;
}

export function isImapReady(config: ImapConfig) {
  return getImapConfigIssues(config).length === 0;
}
