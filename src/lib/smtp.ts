import nodemailer from "nodemailer";
import { isSettingEnabled } from "@/lib/settings";
import { parseMailPort } from "@/config/mail-inbox";
import {
  getSmtpProviderPreset,
  resolveSmtpProviderId,
} from "@/config/smtp-providers";

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  notifyEmail: string;
  replyTo: string;
};

export function parseSmtpPort(raw: string | undefined, fallback = 587) {
  return parseMailPort(raw, fallback);
}

/** Ayarlar haritasından SMTP yapılandırmasını çıkarır. */
export function getSmtpConfigFromSettings(settings: Record<string, string>): SmtpConfig {
  const provider = resolveSmtpProviderId(settings.smtp_provider);
  const preset = getSmtpProviderPreset(provider);

  const host = (settings.smtp_host ?? "").trim() || preset.host;
  const port = parseSmtpPort(settings.smtp_port, preset.port || 587);
  const secureExplicit = isSettingEnabled(settings, "smtp_secure", false);
  const secure =
    settings.smtp_secure === "false" || settings.smtp_secure === "0"
      ? false
      : secureExplicit || port === 465 || preset.secure;

  return {
    enabled: isSettingEnabled(settings, "smtp_enabled", false),
    host,
    port,
    secure,
    user: (settings.smtp_user ?? "").trim(),
    password: settings.smtp_password ?? "",
    fromName: (settings.mail_from_name ?? "").trim() || "İhsan Akyıldız",
    fromEmail: (settings.mail_from_email ?? "").trim(),
    notifyEmail: (settings.mail_notify_email ?? "").trim(),
    replyTo: (settings.mail_reply_to ?? "").trim(),
  };
}

export function getSmtpConfigIssues(config: SmtpConfig): string[] {
  const issues: string[] = [];
  if (!config.enabled) {
    issues.push("SMTP gönderimi kapalı.");
    return issues;
  }
  if (!config.host) issues.push("SMTP host boş.");
  if (!config.user) issues.push("SMTP kullanıcı adı boş.");
  if (!config.password) issues.push("SMTP şifresi boş.");
  if (!config.fromEmail) issues.push("Gönderen e-posta boş.");
  return issues;
}

export function isSmtpReady(config: SmtpConfig) {
  return getSmtpConfigIssues(config).length === 0;
}

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string | null;
  references?: string | null;
};

/** Kayıtlı SMTP ayarlarıyla e-posta gönderir. */
export async function sendMailWithConfig(config: SmtpConfig, input: SendMailInput) {
  const issues = getSmtpConfigIssues(config);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }

  const transporter = createTransport(config);
  const from = config.fromName
    ? `"${config.fromName.replace(/"/g, "")}" <${config.fromEmail}>`
    : config.fromEmail;

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo || config.replyTo || undefined,
    headers: {
      ...(input.inReplyTo
        ? {
            "In-Reply-To": input.inReplyTo.startsWith("<")
              ? input.inReplyTo
              : `<${input.inReplyTo}>`,
          }
        : {}),
      ...(input.references
        ? {
            References: input.references
              .split(/\s+/)
              .map((id) => id.trim())
              .filter(Boolean)
              .map((id) => (id.startsWith("<") ? id : `<${id}>`))
              .join(" "),
          }
        : {}),
    },
  });

  return info;
}

/** Bağlantıyı doğrular ve bildirim adresine test e-postası yollar. */
export async function sendSmtpTestEmail(config: SmtpConfig, toOverride?: string) {
  const to = (toOverride ?? "").trim() || config.notifyEmail || config.fromEmail;
  if (!to) {
    throw new Error("Test için alıcı e-posta gerekli (bildirim veya gönderen adresi).");
  }

  await createTransport(config).verify();

  const now = new Date().toLocaleString("tr-TR");
  return sendMailWithConfig(config, {
    to,
    subject: "SMTP test — İhsan Akyıldız CMS",
    text: [
      "Bu bir test e-postasıdır.",
      "SMTP ayarlarınız doğru çalışıyor.",
      "",
      `Gönderim zamanı: ${now}`,
      `Host: ${config.host}:${config.port}`,
      `Secure: ${config.secure ? "evet" : "hayır"}`,
    ].join("\n"),
    html: `
      <p><strong>Bu bir test e-postasıdır.</strong></p>
      <p>SMTP ayarlarınız doğru çalışıyor.</p>
      <ul>
        <li>Gönderim zamanı: ${now}</li>
        <li>Host: ${config.host}:${config.port}</li>
        <li>Secure: ${config.secure ? "evet" : "hayır"}</li>
      </ul>
    `,
  });
}
