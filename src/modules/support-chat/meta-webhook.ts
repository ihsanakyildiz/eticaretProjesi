import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import {
  fillSupportChatConversationAvatar,
  fillSupportChatConversationSource,
  ingestSupportChatMessage,
  listActiveSupportChatAccounts,
  type SupportChatAccountMatch,
} from "@/modules/support-chat/db";
import {
  resolveCustomerAvatar,
  supportChatChannelHasSocialAvatar,
  supportChatInstagramAccountContext,
  supportChatInstagramUsername,
} from "@/modules/support-chat/meta-avatar";
import { META_GRAPH_VERSION } from "@/modules/support-chat/meta-oauth";
import { resolveSocialPostSource } from "@/modules/support-chat/meta-source";
import {
  supportChatMediaKindLabel,
  type SupportChatChannel,
  type SupportChatDirection,
  type SupportChatMediaItem,
  type SupportChatMediaKind,
} from "@/modules/support-chat/kinds";
import { downloadRemoteMediaUrl, downloadWhatsAppGraphMedia } from "@/modules/support-chat/media";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asEventList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

const MESSAGING_CHANGE_FIELDS = new Set([
  "messages",
  "messaging_postbacks",
  "messaging_optins",
  "message_echoes",
  "messaging_referrals",
  "message_edits",
]);

function asString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function asBool(value: unknown) {
  return value === true;
}

export function verifyMetaWebhookSignature(raw: string, header: string | null, appSecret: string) {
  if (!appSecret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(raw).digest("hex");
  const actual = header.slice("sha256=".length);
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type PendingMedia =
  | {
      source: "whatsapp";
      mediaId: string;
      mime: string;
      fileName: string;
      kind: SupportChatMediaKind;
    }
  | {
      source: "url";
      url: string;
      mime: string;
      fileName: string;
      kind: SupportChatMediaKind;
    };

type InboundItem = {
  channel: SupportChatChannel;
  lookupIds: string[];
  threadId: string;
  customerName: string;
  customerHandle: string | null;
  body: string;
  direction: SupportChatDirection;
  externalId: string;
  quotedExternalId: string | null;
  sentAt: Date;
  pendingMedia: PendingMedia[];
  postId: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceImage: string | null;
  avatarPersonId: string | null;
  avatarRemoteUrl: string | null;
};

function firstHttpsUrl(value: unknown) {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : "";
}

function dateFromEpoch(value: unknown) {
  if (typeof value === "string" && value.includes("T")) {
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  const raw = typeof value === "number" ? value : Number(asString(value));
  if (!Number.isFinite(raw) || raw <= 0) return new Date();
  const ms = raw < 1e12 ? raw * 1000 : raw;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function messagingBody(message: Record<string, unknown> | null) {
  if (!message) return "";
  const text = message.text;
  if (typeof text === "string" || typeof text === "number") return String(text);
  const nested = asRecord(text);
  if (nested) {
    return asString(nested.body) || asString(nested.text);
  }
  const quickReply = asRecord(message.quick_reply);
  return asString(quickReply?.payload);
}

function messagingAttachmentKind(type: string): SupportChatMediaKind {
  switch (type) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "file":
      return "document";
    case "image":
    case "story_mention":
    case "share":
    case "sticker":
      return "image";
    default:
      return type === "template" || type === "fallback" ? "document" : "image";
  }
}

function messagingPendingMedia(message: Record<string, unknown> | null): PendingMedia[] {
  if (!message) return [];
  const items: PendingMedia[] = [];
  for (const raw of asArray(message.attachments)) {
    const att = asRecord(raw);
    const payload = asRecord(att?.payload);
    const url = asString(payload?.url);
    if (!url) continue;
    const type = asString(att?.type);
    items.push({
      source: "url",
      url,
      mime: asString(payload?.mime_type),
      fileName: asString(payload?.title) || asString(att?.title),
      kind: messagingAttachmentKind(type),
    });
  }
  return items;
}

function whatsappMediaKind(type: string): SupportChatMediaKind | null {
  switch (type) {
    case "image":
    case "sticker":
      return "image";
    case "video":
      return "video";
    case "audio":
    case "voice":
      return "audio";
    case "document":
      return "document";
    default:
      return null;
  }
}

function whatsappPendingMedia(message: Record<string, unknown>): PendingMedia | null {
  const type = asString(message.type);
  const kind = whatsappMediaKind(type);
  if (!kind) return null;
  const part = asRecord(message[type]);
  const mediaId = asString(part?.id);
  if (!mediaId) return null;
  return {
    source: "whatsapp",
    mediaId,
    mime: asString(part?.mime_type),
    fileName: asString(part?.filename),
    kind,
  };
}

function whatsappBody(message: Record<string, unknown>) {
  const type = asString(message.type) || "text";
  switch (type) {
    case "text":
      return asString(asRecord(message.text)?.body);
    case "image":
    case "video":
    case "audio":
    case "voice":
    case "document":
    case "sticker":
      return asString(asRecord(message[type])?.caption);
    case "location": {
      const loc = asRecord(message.location);
      return loc ? `[konum] ${asString(loc.name) || asString(loc.address)}`.trim() : "[konum]";
    }
    case "button":
      return asString(asRecord(message.button)?.text) || "[buton]";
    case "interactive": {
      const interactive = asRecord(message.interactive);
      const buttonReply = asRecord(interactive?.button_reply);
      const listReply = asRecord(interactive?.list_reply);
      return asString(buttonReply?.title) || asString(listReply?.title) || "[etkileşim]";
    }
    case "reaction":
      return asString(asRecord(message.reaction)?.emoji) || "[tepki]";
    default:
      return `[${type}]`;
  }
}

function collectPageMessaging(
  objectType: "page" | "instagram",
  entryId: string,
  messaging: unknown[],
): InboundItem[] {
  const items: InboundItem[] = [];
  const channel: SupportChatChannel = objectType === "instagram" ? "INSTAGRAM_DM" : "FACEBOOK_MESSENGER";
  for (const rawEvent of messaging) {
    const event = asRecord(rawEvent);
    if (!event) continue;
    const sender = asRecord(event.sender);
    const recipient = asRecord(event.recipient);
    const senderId = asString(sender?.id);
    const recipientId = asString(recipient?.id);
    const message = asRecord(event.message);
    const postback = asRecord(event.postback);
    if (!senderId) continue;
    const isEcho = asBool(message?.is_echo);
    const direction: SupportChatDirection = isEcho ? "OUT" : "IN";
    const customerId = direction === "IN" ? senderId : recipientId;
    if (!customerId) continue;
    const pendingMedia = messagingPendingMedia(message);
    let body = messagingBody(message) || asString(postback?.title) || asString(postback?.payload);
    if (!body && pendingMedia.length === 0) {
      if (!message && !postback) continue;
      body = "[mesaj]";
    }
    const mid = asString(message?.mid) || asString(postback?.mid) || asString(event.timestamp) + customerId;
    const replyTo = asRecord(message?.reply_to);
    const quotedExternalId = asString(replyTo?.mid) || null;
    items.push({
      channel,
      lookupIds: [entryId, recipientId, senderId].filter(Boolean),
      threadId: customerId,
      customerName: customerId,
      customerHandle: customerId,
      body,
      direction,
      externalId: mid,
      quotedExternalId,
      sentAt: dateFromEpoch(event.timestamp),
      pendingMedia,
      postId: null,
      sourceUrl: null,
      sourceTitle: null,
      sourceImage: null,
      avatarPersonId: customerId,
      avatarRemoteUrl: null,
    });
  }
  return items;
}

function collectFeedComments(
  entryId: string,
  changes: unknown[],
  channel: "FACEBOOK_POST" | "INSTAGRAM_POST",
): InboundItem[] {
  const items: InboundItem[] = [];
  for (const rawChange of changes) {
    const change = asRecord(rawChange);
    if (!change) continue;
    const field = asString(change.field);
    const value = asRecord(change.value);
    if (!value) continue;
    const item = asString(value.item);
    const verb = asString(value.verb);
    if (verb === "remove") continue;
    const comment = asRecord(value.comment);
    const commentId = asString(value.comment_id) || asString(comment?.id) || asString(value.id);
    if (channel === "FACEBOOK_POST") {
      if (field !== "feed" && field !== "comments") continue;
      if (!commentId) continue;
      if (item && item !== "comment" && item !== "comment_mention" && !asString(value.comment_id)) continue;
    } else if (field !== "comments" && field !== "live_comments" && field !== "mentions" && field !== "feed") {
      continue;
    }
    const from = asRecord(value.from) ?? asRecord(comment?.from);
    const fromId = asString(from?.id);
    const body = asString(value.message) || asString(value.text) || asString(comment?.message);
    if (!commentId) continue;
    const post = asRecord(value.post);
    const media = asRecord(value.media);
    const postId =
      asString(value.post_id) ||
      asString(post?.id) ||
      asString(value.media_id) ||
      asString(media?.id);
    const parentId = asString(value.parent_id);
    const sourceUrl =
      asString(value.permalink_url) ||
      asString(value.permalink) ||
      asString(post?.permalink_url) ||
      asString(media?.permalink) ||
      null;
    const sourceTitle =
      asString(post?.message) ||
      asString(media?.caption) ||
      asString(value.post_url) ||
      null;
    const sourceImage =
      asString(post?.full_picture) ||
      asString(post?.picture) ||
      asString(media?.media_url) ||
      asString(media?.thumbnail_url) ||
      asString(value.photo) ||
      null;
    items.push({
      channel,
      lookupIds: [entryId, postId, asString(value.recipient_id)].filter(Boolean),
      threadId: parentId || commentId,
      customerName: asString(from?.name) || asString(from?.username) || fromId || "Yorum",
      customerHandle: asString(from?.username) || fromId || null,
      body: body || "[yorum]",
      direction: "IN",
      externalId: commentId,
      quotedExternalId: parentId || null,
      sentAt: dateFromEpoch(value.created_time ?? value.timestamp),
      pendingMedia: [],
      postId: postId || null,
      sourceUrl,
      sourceTitle,
      sourceImage,
      avatarPersonId: fromId || asString(from?.username) || null,
      avatarRemoteUrl: null,
    });
  }
  return items;
}

function collectWhatsApp(entry: Record<string, unknown>): InboundItem[] {
  const items: InboundItem[] = [];
  const wabaId = asString(entry.id);
  for (const rawChange of asArray(entry.changes)) {
    const change = asRecord(rawChange);
    const value = asRecord(change?.value);
    if (!value) continue;
    const metadata = asRecord(value.metadata);
    const phoneNumberId = asString(metadata?.phone_number_id);
    const contacts = asArray(value.contacts);
    const contact = asRecord(contacts[0]);
    const profile = asRecord(contact?.profile);
    const contactName = asString(profile?.name);
    const profilePicture =
      firstHttpsUrl(profile?.profile_picture) ||
      firstHttpsUrl(profile?.profile_pic) ||
      firstHttpsUrl(profile?.picture) ||
      firstHttpsUrl(contact?.profile_picture);
    for (const rawMessage of asArray(value.messages)) {
      const message = asRecord(rawMessage);
      if (!message) continue;
      const from = asString(message.from);
      const id = asString(message.id);
      const pending = whatsappPendingMedia(message);
      const body = whatsappBody(message);
      if (!from || !id || (!body && !pending)) continue;
      const context = asRecord(message.context);
      const quotedExternalId = asString(context?.id) || null;
      items.push({
        channel: "WHATSAPP",
        lookupIds: [phoneNumberId, wabaId].filter(Boolean),
        threadId: from,
        customerName: contactName || from,
        customerHandle: from,
        body,
        direction: "IN",
        externalId: id,
        quotedExternalId,
        sentAt: dateFromEpoch(message.timestamp),
        pendingMedia: pending ? [pending] : [],
        postId: null,
        sourceUrl: null,
        sourceTitle: null,
        sourceImage: null,
        avatarPersonId: from,
        avatarRemoteUrl: profilePicture || null,
      });
    }
  }
  return items;
}

function messagingEventsFromEntry(entry: Record<string, unknown>): unknown[] {
  const events = [...asEventList(entry.messaging), ...asEventList(entry.standby)];
  for (const rawChange of asEventList(entry.changes)) {
    const change = asRecord(rawChange);
    if (!change) continue;
    const field = asString(change.field);
    if (!MESSAGING_CHANGE_FIELDS.has(field)) continue;
    const value = asRecord(change.value);
    if (!value) continue;
    if (value.sender || value.recipient || value.message || value.postback) {
      events.push(value);
    }
    events.push(...asEventList(value.messaging));
  }
  return events;
}

function collectInboundItems(payload: unknown): InboundItem[] {
  const root = asRecord(payload);
  if (!root) return [];
  const objectType = asString(root.object);
  const items: InboundItem[] = [];
  for (const rawEntry of asEventList(root.entry)) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;
    const entryId = asString(entry.id);
    const messaging = messagingEventsFromEntry(entry);
    switch (objectType) {
      case "page":
        items.push(...collectPageMessaging("page", entryId, messaging));
        items.push(...collectFeedComments(entryId, asEventList(entry.changes), "FACEBOOK_POST"));
        break;
      case "instagram":
        items.push(...collectPageMessaging("instagram", entryId, messaging));
        items.push(...collectFeedComments(entryId, asEventList(entry.changes), "INSTAGRAM_POST"));
        break;
      case "whatsapp_business_account":
        items.push(...collectWhatsApp(entry));
        break;
      default:
        if (messaging.length > 0) {
          items.push(...collectPageMessaging("page", entryId, messaging));
        }
        break;
    }
  }
  return items;
}

function idsOf(account: SupportChatAccountMatch) {
  return [
    account.externalId,
    account.credentials.pageId,
    account.credentials.instagramId,
    account.credentials.phoneNumberId,
    account.credentials.wabaId,
    account.credentials.globalBrandPageId,
  ].filter(Boolean);
}

function isFacebookFamily(channel: SupportChatChannel) {
  switch (channel) {
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return true;
    case "WHATSAPP":
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return false;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function isPostPreviewChannel(channel: SupportChatChannel) {
  switch (channel) {
    case "FACEBOOK_POST":
    case "INSTAGRAM_POST":
      return true;
    case "FACEBOOK_MESSENGER":
    case "INSTAGRAM_DM":
    case "WHATSAPP":
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return false;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export type SupportChatWebhookSourceJob = {
  accountId: string;
  channel: SupportChatChannel;
  threadId: string;
  token: string;
  pageId: string;
  postId: string;
  permalink: string;
  postMessage: string;
  postImage: string;
};

export async function enrichWebhookPostSources(jobs: SupportChatWebhookSourceJob[]) {
  for (const job of jobs) {
    const source = await resolveSocialPostSource({
      channel: job.channel,
      token: job.token,
      pageId: job.pageId,
      postId: job.postId,
      commentId: job.threadId,
      permalink: job.permalink,
      postMessage: job.postMessage,
      postImage: job.postImage,
    });
    if (!source) continue;
    await fillSupportChatConversationSource(job.accountId, job.threadId, source);
  }
}

export type SupportChatWebhookAvatarJob = {
  accountId: string;
  channel: SupportChatChannel;
  threadId: string;
  token: string;
  personId: string;
  username: string;
  instagramId: string;
  ownUsername: string;
  remoteUrl: string | null;
};

export async function enrichWebhookCustomerAvatars(jobs: SupportChatWebhookAvatarJob[]) {
  const seen = new Set<string>();
  for (const job of jobs) {
    const key = `${job.accountId}:${job.threadId}`;
    if (seen.has(key) || (!job.personId && !job.username)) continue;
    seen.add(key);
    const avatar = await resolveCustomerAvatar({
      channel: job.channel,
      token: job.token,
      personId: job.personId,
      username: job.username,
      instagramId: job.instagramId,
      ownUsername: job.ownUsername,
      remoteUrl: job.remoteUrl,
    });
    if (!avatar) continue;
    await fillSupportChatConversationAvatar(job.accountId, job.threadId, avatar);
  }
}

function matchAccount(accounts: SupportChatAccountMatch[], item: InboundItem) {
  const lookup = new Set(item.lookupIds);
  const idMatch = (account: SupportChatAccountMatch) => idsOf(account).some((id) => lookup.has(id));
  const sameChannel = accounts.filter((account) => account.channel === item.channel);
  const exact = sameChannel.find(idMatch);
  if (exact) return exact;
  const related = accounts.find(idMatch);
  if (!related) return null;
  const pageId = related.credentials.pageId || related.externalId;
  const preferred = accounts.find(
    (account) => account.channel === item.channel && idsOf(account).includes(pageId),
  );
  if (preferred) return preferred;
  if (isFacebookFamily(item.channel) && isFacebookFamily(related.channel)) return related;
  return null;
}

async function lookupSenderName(pageToken: string, senderId: string) {
  if (!pageToken || !senderId) return "";
  try {
    const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${senderId}`);
    url.searchParams.set("fields", "name,username");
    url.searchParams.set("access_token", pageToken);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(700) });
    const json = (await response.json()) as { name?: string; username?: string };
    return json.name || json.username || "";
  } catch {
    return "";
  }
}

async function materializePendingMedia(pending: PendingMedia[], tokens: string[]): Promise<SupportChatMediaItem[]> {
  const items: SupportChatMediaItem[] = [];
  for (const item of pending) {
    switch (item.source) {
      case "whatsapp": {
        const saved = await downloadWhatsAppGraphMedia({
          mediaId: item.mediaId,
          tokens,
          mime: item.mime,
          fileName: item.fileName,
          kind: item.kind,
        });
        if (saved) items.push(saved);
        break;
      }
      case "url": {
        const saved = await downloadRemoteMediaUrl({
          url: item.url,
          tokens,
          mime: item.mime,
          fileName: item.fileName,
          kind: item.kind,
        });
        if (saved) items.push(saved);
        break;
      }
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
  }
  return items;
}

export async function ingestMetaWebhookPayload(payload: unknown) {
  const items = collectInboundItems(payload);
  if (items.length === 0) {
    return {
      ok: true as const,
      ingested: 0,
      enrichJobs: [] as SupportChatWebhookSourceJob[],
      avatarJobs: [] as SupportChatWebhookAvatarJob[],
      autoReplyJobs: [] as string[],
    };
  }
  const accounts = await listActiveSupportChatAccounts();
  if (accounts.length === 0) {
    return {
      ok: true as const,
      ingested: 0,
      enrichJobs: [] as SupportChatWebhookSourceJob[],
      avatarJobs: [] as SupportChatWebhookAvatarJob[],
      autoReplyJobs: [] as string[],
    };
  }
  let ingested = 0;
  let matched = 0;
  const enrichJobs: SupportChatWebhookSourceJob[] = [];
  const avatarJobs: SupportChatWebhookAvatarJob[] = [];
  const autoReplyJobs: string[] = [];
  for (const item of items) {
    const account = matchAccount(accounts, item);
    if (!account) continue;
    matched += 1;
    let customerName = item.customerName;
    if (item.direction === "IN" && (customerName === item.threadId || !customerName.trim())) {
      const token = account.credentials.pageAccessToken;
      const resolved = await lookupSenderName(token, item.threadId);
      if (resolved) customerName = resolved;
    }
    const tokens = [
      account.credentials.userAccessToken,
      account.credentials.pageAccessToken,
    ].filter(Boolean);
    const media = await materializePendingMedia(item.pendingMedia, tokens);
    const body =
      item.body.trim() || (media[0] ? supportChatMediaKindLabel(media[0].kind) : "");
    if (!body && media.length === 0) continue;
    const result = await ingestSupportChatMessage({
      accountId: account.id,
      channel: item.channel,
      externalThreadId: item.threadId,
      customerName,
      customerHandle: item.customerHandle,
      customerAvatar: null,
      body,
      direction: item.direction,
      externalId: item.externalId,
      sentAt: item.sentAt,
      origin: "live",
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle,
      sourceImage: item.sourceImage,
      media,
      quote: item.quotedExternalId
        ? {
            messageId: null,
            externalId: item.quotedExternalId,
            body: "Alıntılanan mesaj",
            direction: null,
          }
        : null,
    });
    if ("ok" in result && !result.duplicate) {
      ingested += 1;
      if (item.direction === "IN" && result.conversationId) {
        autoReplyJobs.push(result.conversationId);
      }
    }
    if (isPostPreviewChannel(item.channel) && (!item.sourceUrl || !item.sourceImage)) {
      enrichJobs.push({
        accountId: account.id,
        channel: item.channel,
        threadId: item.threadId,
        token: account.credentials.pageAccessToken,
        pageId: account.credentials.pageId || account.externalId,
        postId: item.postId ?? "",
        permalink: item.sourceUrl ?? "",
        postMessage: item.sourceTitle ?? "",
        postImage: item.sourceImage ?? "",
      });
    }
    const username = supportChatInstagramUsername(item.customerHandle, item.customerName);
    if (supportChatChannelHasSocialAvatar(item.channel) && (item.avatarPersonId || username)) {
      const ig = supportChatInstagramAccountContext(account.credentials, accounts);
      avatarJobs.push({
        accountId: account.id,
        channel: item.channel,
        threadId: item.threadId,
        token: account.credentials.pageAccessToken || account.credentials.userAccessToken || "",
        personId: item.avatarPersonId ?? "",
        username,
        instagramId: ig.instagramId,
        ownUsername: ig.ownUsername,
        remoteUrl: item.avatarRemoteUrl,
      });
    }
  }
  if (matched === 0) {
    console.warn("support-chat: webhook items unmatched", items[0]?.channel, items[0]?.lookupIds);
  }
  return { ok: true as const, ingested, enrichJobs, avatarJobs, autoReplyJobs };
}
