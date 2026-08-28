import type { MailFolder, MailMessage, MailSource } from "@prisma/client";

export type MailFolderKey =
  | "inbox"
  | "sent"
  | "starred"
  | "draft"
  | "spam"
  | "trash";

export type MailLabelKey = "updates" | "important" | "personal" | "private" | "contact";

export const MAIL_FOLDER_MAP: Record<
  MailFolderKey,
  { folder?: MailFolder; starredOnly?: boolean; title: string }
> = {
  inbox: { folder: "INBOX", title: "Gelen Kutusu" },
  sent: { folder: "SENT", title: "Gönderilenler" },
  starred: { starredOnly: true, title: "Yıldızlı" },
  draft: { folder: "DRAFT", title: "Taslaklar" },
  spam: { folder: "SPAM", title: "Spam" },
  trash: { folder: "TRASH", title: "Çöp Kutusu" },
};

export const MAIL_LABELS: {
  key: MailLabelKey;
  label: string;
  color: string;
}[] = [
  { key: "updates", label: "Güncellemeler", color: "#3577f1" },
  { key: "important", label: "Önemli", color: "#0ab39c" },
  { key: "personal", label: "Kişisel", color: "#f7b84b" },
  { key: "private", label: "Özel", color: "#f06548" },
  { key: "contact", label: "İletişim", color: "#405189" },
];

export function resolveMailFolderKey(raw: string | null | undefined): MailFolderKey {
  const key = String(raw ?? "inbox").toLowerCase() as MailFolderKey;
  return key in MAIL_FOLDER_MAP ? key : "inbox";
}

export function resolveMailLabelKey(raw: string | null | undefined): MailLabelKey | null {
  if (!raw) return null;
  const key = String(raw).toLowerCase() as MailLabelKey;
  return MAIL_LABELS.some((item) => item.key === key) ? key : null;
}

export type MailListItem = {
  id: string;
  folder: MailFolder;
  source: MailSource;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  replyToEmail: string | null;
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string | null;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  label: string | null;
  receivedAt: string;
  parentId: string | null;
};

type MailListSummaryRow = {
  id: string;
  folder: MailFolder;
  source: MailSource;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  preview: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  label: string | null;
  receivedAt: Date;
  parentId: string | null;
};

export function toMailListSummaryItem(row: MailListSummaryRow): MailListItem {
  return {
    id: row.id,
    folder: row.folder,
    source: row.source,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    replyToEmail: null,
    subject: row.subject,
    preview: row.preview,
    bodyText: "",
    bodyHtml: null,
    isRead: row.isRead,
    isStarred: row.isStarred,
    hasAttachment: row.hasAttachment,
    label: row.label,
    receivedAt: row.receivedAt.toISOString(),
    parentId: row.parentId,
  };
}

export function toMailListItem(row: MailMessage): MailListItem {
  return {
    id: row.id,
    folder: row.folder,
    source: row.source,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    replyToEmail: row.replyToEmail,
    subject: row.subject,
    preview: row.preview,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    isRead: row.isRead,
    isStarred: row.isStarred,
    hasAttachment: row.hasAttachment,
    label: row.label,
    receivedAt: row.receivedAt.toISOString(),
    parentId: row.parentId,
  };
}

export function initialsFromName(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "?";
}

export function formatMailDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMailRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;

  return formatMailDate(iso);
}

export function avatarTone(seed: string) {
  const tones = [
    "bg-[#3577f1]/15 text-[#3577f1]",
    "bg-[#0ab39c]/15 text-[#0ab39c]",
    "bg-[#f7b84b]/20 text-[#b58105]",
    "bg-[#f06548]/15 text-[#f06548]",
    "bg-[#405189]/15 text-[#405189]",
    "bg-violet-100 text-violet-700",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % tones.length;
  }
  return tones[hash] ?? tones[0]!;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type QuotedMailMessage = {
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date | string;
};

/** Müşteriye giden yanıta orijinal mesajı ekler (hatırlatma amaçlı) */
export function buildReplyOutboundContent(
  replyBody: string,
  quoted: QuotedMailMessage,
): { text: string; html: string } {
  const when =
    typeof quoted.receivedAt === "string"
      ? formatMailDate(quoted.receivedAt)
      : formatMailDate(quoted.receivedAt.toISOString());

  const quotedText = (
    quoted.bodyText?.trim() ||
    quoted.bodyHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
    ""
  ).trim();

  const text = [
    replyBody.trim(),
    "",
    "---------- Orijinal Mesaj ----------",
    `Kimden: ${quoted.fromName} <${quoted.fromEmail}>`,
    `Tarih: ${when}`,
    `Konu: ${quoted.subject}`,
    "",
    quotedText,
  ].join("\n");

  const quotedHtmlBlock = quoted.bodyHtml?.trim()
    ? quoted.bodyHtml
    : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(quotedText)}</pre>`;

  const html = `
<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;">
  <div style="white-space:pre-wrap;">${escapeHtml(replyBody.trim())}</div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <div style="padding:12px 14px;background:#f8fafc;border-left:3px solid #94a3b8;color:#475569;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#64748b;">
      Orijinal mesajınız (${escapeHtml(when)})
    </p>
    <p style="margin:0 0 4px;font-size:12px;">
      <strong>${escapeHtml(quoted.fromName)}</strong>
      &lt;${escapeHtml(quoted.fromEmail)}&gt;
    </p>
    <p style="margin:0 0 12px;font-size:12px;">
      Konu: ${escapeHtml(quoted.subject)}
    </p>
    <div style="font-size:13px;color:#334155;">${quotedHtmlBlock}</div>
  </div>
</div>`.trim();

  return { text, html };
}

