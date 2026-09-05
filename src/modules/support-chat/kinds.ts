export const SUPPORT_CHAT_MODULE_ID = "support-chat" as const;

export type SupportChatLicenseState = {
  licensed: boolean;
  expiresAt: string | null;
  activatedAt: string | null;
};

export const SUPPORT_CHAT_CHANNELS = [
  "WHATSAPP",
  "FACEBOOK_MESSENGER",
  "FACEBOOK_POST",
  "INSTAGRAM_DM",
  "INSTAGRAM_POST",
  "TELEGRAM",
  "TIKTOK",
  "WEB",
] as const;

export type SupportChatChannel = (typeof SUPPORT_CHAT_CHANNELS)[number];

export const SUPPORT_CHAT_ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type SupportChatAccountStatus = (typeof SUPPORT_CHAT_ACCOUNT_STATUSES)[number];

export const SUPPORT_CHAT_CONVERSATION_STATUSES = ["OPEN", "PENDING", "CLOSED"] as const;
export type SupportChatConversationStatus = (typeof SUPPORT_CHAT_CONVERSATION_STATUSES)[number];

export const SUPPORT_CHAT_HANDLED_BY = ["HUMAN", "BOT"] as const;
export type SupportChatHandledBy = (typeof SUPPORT_CHAT_HANDLED_BY)[number];

export const SUPPORT_CHAT_DIRECTIONS = ["IN", "OUT"] as const;
export type SupportChatDirection = (typeof SUPPORT_CHAT_DIRECTIONS)[number];

export const SUPPORT_CHAT_FOLDERS = ["INBOX", "ARCHIVE", "TRASH"] as const;
export type SupportChatFolder = (typeof SUPPORT_CHAT_FOLDERS)[number];

export function isSupportChatFolder(value: string): value is SupportChatFolder {
  return (SUPPORT_CHAT_FOLDERS as readonly string[]).includes(value);
}

export function supportChatFolderLabel(folder: SupportChatFolder) {
  switch (folder) {
    case "INBOX":
      return "Gelen Kutusu";
    case "ARCHIVE":
      return "Arşiv Kutusu";
    case "TRASH":
      return "Çöp Kutusu";
    default: {
      const _exhaustive: never = folder;
      return _exhaustive;
    }
  }
}

export function supportChatFolderStatusLabel(folder: SupportChatFolder) {
  switch (folder) {
    case "INBOX":
      return "Gelen kutusu";
    case "ARCHIVE":
      return "Arşivde";
    case "TRASH":
      return "Çöpte";
    default: {
      const _exhaustive: never = folder;
      return _exhaustive;
    }
  }
}

function foldSupportChatPersonName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/\s+/g, " ");
}

function isGenericSupportChatPersonName(name: string) {
  switch (name) {
    case "facebook kullanicisi":
    case "musteri":
    case "yorum":
      return true;
    default:
      return false;
  }
}

export function supportChatPersonFamily(channel: SupportChatChannel) {
  switch (channel) {
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
      return "facebook";
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return "instagram";
    case "WHATSAPP":
      return "whatsapp";
    case "TELEGRAM":
      return "telegram";
    case "TIKTOK":
      return "tiktok";
    case "WEB":
      return "web";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export function supportChatPersonKey(row: {
  id: string;
  channel: SupportChatChannel;
  customerName: string;
  customerHandle: string | null;
}) {
  const family = supportChatPersonFamily(row.channel);
  const name = foldSupportChatPersonName(row.customerName);
  const handle = (row.customerHandle ?? "").replace(/^@/, "").trim().toLowerCase();
  switch (family) {
    case "whatsapp": {
      const digits = handle.replace(/\D/g, "");
      if (digits.length >= 10) return `whatsapp:${digits.slice(-10)}`;
      if (digits.length >= 7) return `whatsapp:${digits}`;
      return `whatsapp:row:${row.id}`;
    }
    case "facebook":
      if (name && !isGenericSupportChatPersonName(name)) return `facebook:name:${name}`;
      if (/^\d+$/.test(handle)) return `facebook:id:${handle}`;
      return `facebook:row:${row.id}`;
    case "instagram":
      if (/^[a-z0-9._]{1,30}$/.test(handle) && !/^\d+$/.test(handle)) return `instagram:@${handle}`;
      if (name && !name.includes(" ") && !isGenericSupportChatPersonName(name)) return `instagram:@${name}`;
      if (name && !isGenericSupportChatPersonName(name)) return `instagram:name:${name}`;
      if (/^\d+$/.test(handle)) return `instagram:id:${handle}`;
      return `instagram:row:${row.id}`;
    case "telegram":
    case "tiktok":
    case "web":
      if (handle) return `${family}:${handle}`;
      if (name && !isGenericSupportChatPersonName(name)) return `${family}:name:${name}`;
      return `${family}:row:${row.id}`;
    default: {
      const _exhaustive: never = family;
      return _exhaustive;
    }
  }
}

export function isSupportChatChannel(value: string): value is SupportChatChannel {
  return (SUPPORT_CHAT_CHANNELS as readonly string[]).includes(value);
}

export function supportChatChannelLabel(channel: SupportChatChannel) {
  switch (channel) {
    case "WHATSAPP":
      return "WhatsApp";
    case "FACEBOOK_MESSENGER":
      return "Facebook Messenger";
    case "FACEBOOK_POST":
      return "Facebook gönderisi";
    case "INSTAGRAM_DM":
      return "Instagram DM";
    case "INSTAGRAM_POST":
      return "Instagram gönderisi";
    case "TELEGRAM":
      return "Telegram";
    case "TIKTOK":
      return "TikTok";
    case "WEB":
      return "Web sohbet";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export const SUPPORT_CHAT_CHANNEL_GROUPS = ["META", "TELEGRAM", "TIKTOK", "WEB"] as const;
export type SupportChatChannelGroup = (typeof SUPPORT_CHAT_CHANNEL_GROUPS)[number];

export const SUPPORT_CHAT_CHANNEL_GROUP_SLUGS = {
  META: "meta-kanallar",
  TELEGRAM: "telegram",
  TIKTOK: "tiktok",
  WEB: "web",
} as const;

export type SupportChatChannelGroupSlug =
  (typeof SUPPORT_CHAT_CHANNEL_GROUP_SLUGS)[SupportChatChannelGroup];

export function supportChatChannelGroupOf(channel: SupportChatChannel): SupportChatChannelGroup {
  switch (channel) {
    case "WHATSAPP":
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return "META";
    case "TELEGRAM":
      return "TELEGRAM";
    case "TIKTOK":
      return "TIKTOK";
    case "WEB":
      return "WEB";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export function supportChatChannelsInGroup(group: SupportChatChannelGroup): SupportChatChannel[] {
  return SUPPORT_CHAT_CHANNELS.filter((channel) => supportChatChannelGroupOf(channel) === group);
}

export function supportChatChannelGroupLabel(group: SupportChatChannelGroup) {
  switch (group) {
    case "META":
      return "Meta";
    case "TELEGRAM":
      return "Telegram";
    case "TIKTOK":
      return "TikTok";
    case "WEB":
      return "Web sohbet";
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export function supportChatChannelGroupSettingsHref(group: SupportChatChannelGroup) {
  return `/admin/settings/support/kanallar/${SUPPORT_CHAT_CHANNEL_GROUP_SLUGS[group]}`;
}

export function supportChatChannelSettingsHref(channel: SupportChatChannel) {
  return supportChatChannelGroupSettingsHref(supportChatChannelGroupOf(channel));
}

export function supportChatChannelGroupFromSlug(slug: string): SupportChatChannelGroup | null {
  switch (slug) {
    case "meta-kanallar":
    case "whatsapp":
    case "facebook-messenger":
    case "facebook-gonderi":
    case "instagram-dm":
    case "instagram-gonderi":
      return "META";
    case "telegram":
      return "TELEGRAM";
    case "tiktok":
      return "TIKTOK";
    case "web":
      return "WEB";
    default:
      return null;
  }
}

export function isSupportChatMetaManagedChannel(channel: SupportChatChannel) {
  return supportChatChannelGroupOf(channel) === "META";
}

export function supportChatChannelGroupSettingsDescription(group: SupportChatChannelGroup) {
  switch (group) {
    case "META":
      return "WhatsApp, Facebook Messenger, Facebook gönderisi, Instagram DM ve Instagram gönderisi tek yerden bağlanır ve yönetilir.";
    case "TELEGRAM":
      return "Telegram bot veya hesap bilgilerinizi ekleyin; bu sayfa yalnızca Telegram konuşmalarını etkiler.";
    case "TIKTOK":
      return "TikTok hesap bilgilerinizi ekleyin; bu sayfa yalnızca TikTok konuşmalarını etkiler.";
    case "WEB":
      return "Sitedeki web sohbet widget’ı için hesap tanımı ekleyin ve yönetin.";
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export function supportChatChannelShort(channel: SupportChatChannel) {
  switch (channel) {
    case "WHATSAPP":
      return "WhatsApp";
    case "FACEBOOK_MESSENGER":
      return "Messenger";
    case "FACEBOOK_POST":
      return "Facebook";
    case "INSTAGRAM_DM":
      return "Instagram DM";
    case "INSTAGRAM_POST":
      return "Instagram";
    case "TELEGRAM":
      return "Telegram";
    case "TIKTOK":
      return "TikTok";
    case "WEB":
      return "Web";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export const SUPPORT_CHAT_SETTINGS_LINKS = [
  { href: "/admin/settings/support/ayarlar", label: "Ayarlar" },
  { href: "/admin/settings/support/otomatik-mesajlar", label: "Otomatik mesajlar" },
  { href: "/admin/settings/support/kanallar", label: "Kanallar" },
  { href: "/admin/settings/support/web", label: "Web sohbet" },
  { href: "/admin/settings/support/temsilciler", label: "Temsilciler" },
] as const;

export type SupportChatMetaGroup = "facebook" | "instagram" | "whatsapp";

export type SupportChatMetaPick = {
  pickId: string;
  group: SupportChatMetaGroup;
  name: string;
  hint: string;
};

export function supportChatMetaGroupLabel(group: SupportChatMetaGroup) {
  switch (group) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "whatsapp":
      return "WhatsApp";
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export function supportChatMetaQueryMessage(code: string | null | undefined) {
  switch (code) {
    case "ok":
      return "Seçilen Meta hesapları projeye bağlandı.";
    case "yetki":
      return "Bu işlem için yetkiniz yok.";
    case "ayar":
      return "Önce Meta Uygulama ID ve gizli anahtarını kaydedin.";
    case "lisans":
      return "Sohbet modülü lisanslı değil.";
    case "iptal":
      return "Meta girişi iptal edildi.";
    case "guvenlik":
      return "Meta oturumu doğrulanamadı. Tekrar deneyin.";
    case "bos":
      return "Seçilecek Facebook, Instagram veya WhatsApp hesabı bulunamadı.";
    case "sure":
      return "Meta seçim oturumu doldu. Tekrar bağlanın.";
    case "hata":
      return "Meta bağlantısı kurulamadı. Uygulama ayarlarını ve yönlendirme adresini kontrol edin.";
    case null:
    case undefined:
    case "":
      return null;
    default:
      return "Meta bağlantısında bir sorun oluştu.";
  }
}

export function isSupportChatInboxHref(href: string) {
  return href === "/admin/support" || href.startsWith("/admin/support/");
}

export const SUPPORT_CHAT_INBOX_TABS = ["hepsi", "bot", "benim"] as const;
export type SupportChatInboxTab = (typeof SUPPORT_CHAT_INBOX_TABS)[number];

export function isSupportChatInboxTab(value: string | null | undefined): value is SupportChatInboxTab {
  return value === "hepsi" || value === "bot" || value === "benim";
}

export function supportChatInboxHref(input: {
  conversationId?: string | null;
  tab: SupportChatInboxTab;
}) {
  const id = input.conversationId?.trim() || "";
  const params = new URLSearchParams();
  params.set("tab", input.tab);
  if (id) params.set("c", id);
  return `/admin/support?${params.toString()}`;
}

export function supportChatConversationIdFromPath(pathname: string) {
  const prefix = "/admin/support/";
  if (!pathname.startsWith(prefix)) return null;
  const id = pathname.slice(prefix.length).split("/")[0]?.trim() || "";
  return id || null;
}

export function supportChatConversationIdFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
) {
  const fromQuery = searchParams.get("c")?.trim() || "";
  if (fromQuery) return fromQuery;
  return supportChatConversationIdFromPath(pathname);
}

export function isSupportChatSettingsHref(href: string) {
  return href === "/admin/settings/support" || href.startsWith("/admin/settings/support/");
}

export type SupportChatAccountRow = {
  id: string;
  channel: SupportChatChannel;
  channelLabel: string;
  name: string;
  externalId: string;
  status: SupportChatAccountStatus;
  departmentId: string | null;
  pageId: string;
  instagramId: string;
  instagramUsername: string;
  phoneNumberId: string;
  hasPageToken: boolean;
  createdAt: string;
};

export type SupportChatTagRow = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type SupportChatDepartmentRow = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type SupportChatReplyRow = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
};

export type SupportChatConversationRow = {
  id: string;
  accountId: string;
  channel: SupportChatChannel;
  channelLabel: string;
  customerUserId: string | null;
  customerName: string;
  customerHandle: string | null;
  customerAvatar: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
  assignedUserId: string | null;
  assignedName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentColor: string | null;
  folder: SupportChatFolder;
  status: string;
  handledBy: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceImage: string | null;
};

export type SupportChatCustomerProfile = {
  conversationId: string;
  customerUserId: string | null;
  customerNo: number | null;
  name: string;
  email: string;
  phone: string;
  handle: string | null;
  avatar: string | null;
  sourceLabel: string;
  channelLabel: string;
  groupLabel: string;
  isActive: boolean | null;
  orderCount: number;
  chatCount: number;
  addressCount: number;
  createdAt: string | null;
  notes: string | null;
};

export type SupportChatMessageRow = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  sentAt: string;
  quote: SupportChatQuote | null;
  media: SupportChatMediaItem[];
};

export type SupportChatQuote = {
  messageId: string | null;
  externalId: string | null;
  body: string;
  direction: "IN" | "OUT" | null;
};

export const SUPPORT_CHAT_MEDIA_KINDS = ["image", "video", "audio", "document"] as const;
export type SupportChatMediaKind = (typeof SUPPORT_CHAT_MEDIA_KINDS)[number];

export type SupportChatMediaItem = {
  kind: SupportChatMediaKind;
  mime: string;
  fileName: string;
  src: string;
};

export function isSupportChatMediaKind(value: string): value is SupportChatMediaKind {
  return (SUPPORT_CHAT_MEDIA_KINDS as readonly string[]).includes(value);
}

export function supportChatKindFromMime(mime: string): SupportChatMediaKind {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.startsWith("image/")) return "image";
  if (base.startsWith("video/")) return "video";
  if (base.startsWith("audio/")) return "audio";
  return "document";
}

export function supportChatKindFromFile(mime: string, fileName?: string): SupportChatMediaKind {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.startsWith("image/") || base.startsWith("video/") || base.startsWith("audio/")) {
    return supportChatKindFromMime(base);
  }
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "webp":
    case "gif":
      return "image";
    case "mp4":
    case "mov":
    case "webm":
    case "3gp":
      return "video";
    case "mp3":
    case "ogg":
    case "m4a":
    case "aac":
    case "amr":
    case "wav":
    case "opus":
      return "audio";
    default:
      return supportChatKindFromMime(base);
  }
}

export function supportChatMediaKindLabel(kind: SupportChatMediaKind) {
  switch (kind) {
    case "image":
      return "Görsel";
    case "video":
      return "Video";
    case "audio":
      return "Ses";
    case "document":
      return "Dosya";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isSafeSupportChatMediaSrc(src: string) {
  return src.startsWith("/uploads/support-chat/") && !src.includes("..") && !src.includes("\\");
}

export function parseSupportChatMediaItems(mediaJson: string | null | undefined): SupportChatMediaItem[] {
  if (!mediaJson) return [];
  try {
    const parsed = JSON.parse(mediaJson) as { media?: unknown };
    if (!Array.isArray(parsed.media)) return [];
    return parsed.media.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const rec = raw as Record<string, unknown>;
      const kind = typeof rec.kind === "string" && isSupportChatMediaKind(rec.kind) ? rec.kind : null;
      const src = typeof rec.src === "string" ? rec.src : "";
      const mime = typeof rec.mime === "string" ? rec.mime : "";
      const fileName = typeof rec.fileName === "string" ? rec.fileName : "";
      if (!kind || !isSafeSupportChatMediaSrc(src)) return [];
      return [{ kind, src, mime, fileName }];
    });
  } catch {
    return [];
  }
}

export function parseSupportChatMediaQuote(mediaJson: string | null | undefined): SupportChatQuote | null {
  if (!mediaJson) return null;
  try {
    const parsed = JSON.parse(mediaJson) as { quote?: unknown };
    if (!parsed.quote || typeof parsed.quote !== "object") return null;
    const rec = parsed.quote as Record<string, unknown>;
    const body = typeof rec.body === "string" ? rec.body.trim() : "";
    const direction = rec.direction === "OUT" || rec.direction === "IN" ? rec.direction : null;
    const messageId = typeof rec.messageId === "string" && rec.messageId ? rec.messageId : null;
    const externalId = typeof rec.externalId === "string" && rec.externalId ? rec.externalId : null;
    if (!body && !externalId && !messageId) return null;
    return {
      body: body || "Alıntılanan mesaj",
      direction,
      messageId,
      externalId,
    };
  } catch {
    return null;
  }
}

export function serializeSupportChatMessageExtras(input: {
  quote?: SupportChatQuote | null;
  media?: SupportChatMediaItem[] | null;
  autoReplyId?: string | null;
}) {
  const payload: { quote?: SupportChatQuote; media?: SupportChatMediaItem[]; autoReplyId?: string } = {};
  if (input.quote) payload.quote = input.quote;
  if (input.media && input.media.length > 0) payload.media = input.media;
  const autoReplyId = input.autoReplyId?.trim().slice(0, 191);
  if (autoReplyId) payload.autoReplyId = autoReplyId;
  if (!payload.quote && !payload.media && !payload.autoReplyId) return null;
  return JSON.stringify(payload);
}

export function serializeSupportChatQuote(quote: SupportChatQuote) {
  return serializeSupportChatMessageExtras({ quote }) ?? JSON.stringify({ quote });
}

export function supportChatMessagePreview(body: string, media?: SupportChatMediaItem[] | null) {
  const trimmed = body.trim();
  if (trimmed && trimmed !== "(medya)") return trimmed.slice(0, 280);
  if (media?.[0]) return supportChatMediaKindLabel(media[0].kind);
  return trimmed.slice(0, 280) || "(medya)";
}
