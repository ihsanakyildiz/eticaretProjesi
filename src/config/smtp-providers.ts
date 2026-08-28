export type SmtpProviderId =
  | "custom"
  | "gmail"
  | "outlook"
  | "yahoo"
  | "yandex"
  | "zoho"
  | "amazon_ses"
  | "mailgun"
  | "sendgrid"
  | "brevo";

export type SmtpProviderPreset = {
  id: SmtpProviderId;
  label: string;
  description: string;
  host: string;
  port: number;
  /** true = SSL (465), false = STARTTLS (587) */
  secure: boolean;
  /** Kullanıcı / şifre alanları için kısa rehber */
  guide: string[];
  userPlaceholder?: string;
  passwordHint?: string;
  /** Host/port alanları kilitlensin mi? (özelde serbest) */
  lockServerFields?: boolean;
  /** Gerçek posta kutusu okuma (IMAP) destekleniyor mu? */
  imapSupported?: boolean;
  imapHost?: string;
  imapPort?: number;
  /** true = IMAPS 993 */
  imapSecure?: boolean;
};

export const SMTP_PROVIDER_PRESETS: SmtpProviderPreset[] = [
  {
    id: "custom",
    label: "Özel / Hosting SMTP",
    description: "cPanel, Plesk veya kendi sunucu SMTP bilgilerinizi elle girin.",
    host: "",
    port: 587,
    secure: false,
    lockServerFields: false,
    imapSupported: true,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "Hosting panelinizdeki e-posta hesabı → SMTP bilgilerini kullanın.",
      "Çoğu hostingte host: mail.alanadiniz.com, port: 587 veya 465.",
      "Gelen kutu için genelde aynı sunucu IMAP (993 SSL) kullanır.",
      "Kullanıcı adı genelde tam e-posta adresidir.",
    ],
    userPlaceholder: "info@alanadiniz.com",
    passwordHint: "E-posta hesabının şifresi",
  },
  {
    id: "gmail",
    label: "Gmail / Google Workspace",
    description: "Google hesabı veya Workspace e-postası ile gönderim.",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: true,
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "Google Hesabı → Güvenlik → 2 Adımlı Doğrulama açık olmalı.",
      "Ardından “Uygulama şifreleri” oluşturup buraya yapıştırın (normal şifre çalışmaz).",
      "Gelen kutu (IMAP) için aynı uygulama şifresi kullanılır.",
    ],
    userPlaceholder: "ornek@gmail.com",
    passwordHint: "16 haneli Google uygulama şifresi",
  },
  {
    id: "outlook",
    label: "Outlook / Hotmail / Microsoft 365",
    description: "outlook.com, hotmail.com veya Microsoft 365 hesabı.",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: true,
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "Kişisel Outlook/Hotmail: smtp-mail.outlook.com da kullanılabilir; Office 365 için smtp.office365.com.",
      "Hesapta SMTP AUTH açık olmalıdır (Microsoft 365 yönetim merkezinden).",
      "IMAP: outlook.office365.com (993 SSL).",
    ],
    userPlaceholder: "ornek@outlook.com",
    passwordHint: "Hesap şifresi veya uygulama şifresi",
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    description: "Yahoo e-posta hesabı ile SMTP gönderimi.",
    host: "smtp.mail.yahoo.com",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: true,
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "Yahoo Hesap Güvenliği → Uygulama şifresi oluşturun.",
      "Normal hesap şifresi SMTP/IMAP için kabul edilmez.",
    ],
    userPlaceholder: "ornek@yahoo.com",
    passwordHint: "Yahoo uygulama şifresi",
  },
  {
    id: "yandex",
    label: "Yandex Mail",
    description: "Yandex e-posta (yandex.com / yandex.com.tr).",
    host: "smtp.yandex.com",
    port: 465,
    secure: true,
    lockServerFields: true,
    imapSupported: true,
    imapHost: "imap.yandex.com",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "Yandex → Hesap Yönetimi → Uygulama şifreleri bölümünden SMTP/IMAP şifresi alın.",
      "SMTP port 465 (SSL), IMAP port 993 önerilir.",
    ],
    userPlaceholder: "ornek@yandex.com",
    passwordHint: "Yandex uygulama şifresi",
  },
  {
    id: "zoho",
    label: "Zoho Mail",
    description: "Zoho kişisel veya kurumsal e-posta.",
    host: "smtp.zoho.com",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: true,
    imapHost: "imap.zoho.com",
    imapPort: 993,
    imapSecure: true,
    guide: [
      "EU veri merkezi: smtp.zoho.eu / imap.zoho.eu olabilir.",
      "Zoho’da SMTP ve IMAP erişimini etkinleştirip uygulama şifresi oluşturun.",
    ],
    userPlaceholder: "ornek@zoho.com",
    passwordHint: "Zoho uygulama şifresi veya hesap şifresi",
  },
  {
    id: "amazon_ses",
    label: "Amazon SES",
    description: "AWS Simple Email Service (yüksek hacimli gönderim).",
    host: "email-smtp.eu-central-1.amazonaws.com",
    port: 587,
    secure: false,
    lockServerFields: false,
    imapSupported: false,
    guide: [
      "AWS SES konsolundan SMTP kimlik bilgisi (IAM SMTP user) oluşturun.",
      "Host bölgenize göre değişir: örn. email-smtp.us-east-1.amazonaws.com",
      "SES yalnızca gönderim yapar; gelen kutu için ayrı bir mailbox (IMAP) gerekir.",
    ],
    userPlaceholder: "AKIA... (SMTP kullanıcı adı)",
    passwordHint: "SES SMTP şifresi (IAM access key değil)",
  },
  {
    id: "mailgun",
    label: "Mailgun",
    description: "Mailgun SMTP API üzerinden gönderim.",
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: false,
    guide: [
      "Mailgun → Sending → Domain settings → SMTP credentials.",
      "EU hesabı için host: smtp.eu.mailgun.org olabilir.",
      "Mailgun gönderim servisidir; gelen kutuyu IMAP ile okumak için ayrı mailbox kullanın.",
    ],
    userPlaceholder: "postmaster@mg.alanadiniz.com",
    passwordHint: "Mailgun SMTP şifresi",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    description: "Twilio SendGrid SMTP gönderimi.",
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: false,
    guide: [
      "SendGrid → Settings → API Keys ile bir API key oluşturun.",
      "Kullanıcı adı sabit: apikey",
      "Şifre alanına API key’i yapıştırın.",
      "SendGrid gelen kutu okumaz; iletişim mesajları panelde saklanır.",
    ],
    userPlaceholder: "apikey",
    passwordHint: "SendGrid API Key (şifre olarak)",
  },
  {
    id: "brevo",
    label: "Brevo (Sendinblue)",
    description: "Brevo SMTP ile transactionel e-posta.",
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    lockServerFields: true,
    imapSupported: false,
    guide: [
      "Brevo → SMTP & API → SMTP ayarlarından login/şifre alın.",
      "Gönderen adres Brevo’da doğrulanmış olmalıdır.",
      "Gelen kutu için ayrı IMAP mailbox gerekir.",
    ],
    userPlaceholder: "Brevo SMTP login (e-posta)",
    passwordHint: "Brevo SMTP key / şifre",
  },
];

export function getSmtpProviderPreset(id: string | null | undefined): SmtpProviderPreset {
  const found = SMTP_PROVIDER_PRESETS.find((item) => item.id === id);
  return found ?? SMTP_PROVIDER_PRESETS[0]!;
}

export function resolveSmtpProviderId(raw: string | null | undefined): SmtpProviderId {
  const preset = getSmtpProviderPreset(raw);
  return preset.id;
}
