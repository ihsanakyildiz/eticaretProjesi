import "server-only";

import { startSupportChatCustomerBackfill } from "@/modules/support-chat/customer-profiles";
import {
  fillSupportChatConversationAvatar,
  ingestSupportChatMessage,
  listActiveSupportChatAccounts,
  listBlockedSupportChatThreads,
  listExistingSupportChatThreadIds,
  listIgnoredSupportChatExternalIds,
  listKnownSupportChatExternalIds,
  listSupportChatConversationsMissingAvatar,
  listSupportChatConversationsMissingSource,
  readSupportChatHistoryWatermark,
  updateSupportChatConversationSource,
  writeSupportChatHistoryWatermark,
} from "@/modules/support-chat/db";
import { isSupportChatChannel, type SupportChatChannel } from "@/modules/support-chat/kinds";
import {
  isSupportChatBeforeHistoryWatermark,
  isSupportChatBeforeThreadCutoff,
  isSupportChatHistoryTooOld,
  parseSupportChatExternalTime,
} from "@/modules/support-chat/sync-policy";
import {
  resolveCustomerAvatar,
  supportChatAvatarPersonId,
  supportChatInstagramAccountContext,
  supportChatInstagramUsername,
} from "@/modules/support-chat/meta-avatar";
import { graphGet } from "@/modules/support-chat/meta-oauth";
import { materializeKnownPostSource, resolveSocialPostSource } from "@/modules/support-chat/meta-source";

type GraphParticipant = { id?: string; name?: string };
type GraphMessage = {
  id?: string;
  message?: string;
  created_time?: string;
  from?: GraphParticipant;
  sticker?: string;
};
type GraphConversation = {
  id?: string;
  updated_time?: string;
  participants?: { data?: GraphParticipant[] };
  messages?: { data?: GraphMessage[] };
};

function graphSentAt(value?: string) {
  return parseSupportChatExternalTime(value);
}

function accountOwnerIds(account: { externalId: string; credentials: Record<string, string> }) {
  return new Set(
    [
      account.externalId,
      account.credentials.pageId,
      account.credentials.instagramId,
      account.credentials.globalBrandPageId,
    ].filter(Boolean),
  );
}

async function syncGraphConversations(
  account: {
    id: string;
    externalId: string;
    credentials: Record<string, string>;
  },
  ownerId: string,
  token: string,
  channel: Extract<SupportChatChannel, "FACEBOOK_MESSENGER" | "INSTAGRAM_DM">,
  platform: "MESSENGER" | "INSTAGRAM",
) {
  const payload = await graphGet<{ data?: GraphConversation[] }>(
    `/${ownerId}/conversations`,
    token,
    {
      platform,
      limit: "12",
      fields:
        "id,updated_time,participants{id,name},messages.limit(8){id,message,from,created_time,sticker}",
    },
    { retries: 1, timeoutMs: 8_000 },
  );
  const ownerIds = accountOwnerIds(account);
  const pending = payload.data ?? [];
  const threadIds = pending.flatMap((conversation) => {
    const customer = (conversation.participants?.data ?? []).find((person) => person.id && !ownerIds.has(person.id));
    return customer?.id?.trim() ? [customer.id.trim()] : [];
  });
  const messageIds = pending.flatMap((conversation) =>
    (conversation.messages?.data ?? []).map((message) => message.id ?? ""),
  );
  const [known, existing, blocked, ignored, watermark] = await Promise.all([
    listKnownSupportChatExternalIds(messageIds),
    listExistingSupportChatThreadIds(account.id, threadIds),
    listBlockedSupportChatThreads(account.id, threadIds),
    listIgnoredSupportChatExternalIds(messageIds),
    readSupportChatHistoryWatermark(account.id),
  ]);
  let ingested = 0;
  let newestSeen: Date | null = watermark;
  for (const conversation of pending) {
    const participants = conversation.participants?.data ?? [];
    const customer = participants.find((person) => person.id && !ownerIds.has(person.id));
    const customerId = customer?.id?.trim() ?? "";
    if (!customerId) continue;
    const cutoff = blocked.get(customerId) ?? null;
    const exists = existing.has(customerId);
    const messages = [...(conversation.messages?.data ?? [])].reverse();
    for (const message of messages) {
      const externalId = message.id?.trim() ?? "";
      if (!externalId || known.has(externalId) || ignored.has(externalId)) continue;
      const sentAt = graphSentAt(message.created_time);
      if (!sentAt || isSupportChatBeforeThreadCutoff(sentAt, cutoff)) continue;
      if (!cutoff && isSupportChatHistoryTooOld(sentAt)) continue;
      if (!cutoff && exists && isSupportChatBeforeHistoryWatermark(sentAt, watermark)) continue;
      if (!newestSeen || sentAt.getTime() > newestSeen.getTime()) newestSeen = sentAt;
      const fromId = message.from?.id ?? "";
      const direction = fromId && ownerIds.has(fromId) ? ("OUT" as const) : ("IN" as const);
      const body = (message.message ?? "").trim() || (message.sticker ? "[çıkartma]" : "[mesaj]");
      const result = await ingestSupportChatMessage({
        accountId: account.id,
        channel,
        externalThreadId: customerId,
        customerName: customer?.name?.trim() || customerId,
        customerHandle: customerId,
        customerAvatar: null,
        body,
        direction,
        externalId,
        sentAt,
        media: [],
        origin: "history",
      });
      if ("ok" in result && !result.duplicate) ingested += 1;
    }
  }
  if (newestSeen) await writeSupportChatHistoryWatermark(account.id, newestSeen);
  return ingested;
}

function credentialsMap(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null) continue;
      out[key] = String(value);
    }
    return out;
  } catch {
    return {};
  }
}

export async function backfillSupportChatAvatars() {
  const [rows, accounts] = await Promise.all([
    listSupportChatConversationsMissingAvatar(),
    listActiveSupportChatAccounts(),
  ]);
  for (const row of rows) {
    if (!isSupportChatChannel(row.channel)) continue;
    const creds = credentialsMap(row.credentialsJson);
    const token = creds.pageAccessToken || creds.userAccessToken || "";
    const personId = supportChatAvatarPersonId({
      channel: row.channel,
      externalThreadId: row.externalThreadId,
      customerHandle: row.customerHandle,
      customerName: row.customerName,
    });
    const username = supportChatInstagramUsername(row.customerHandle, row.customerName);
    if (!personId && !username) continue;
    if (row.channel !== "WHATSAPP" && !token) continue;
    const ig = supportChatInstagramAccountContext(creds, accounts);
    const avatar = await resolveCustomerAvatar({
      channel: row.channel,
      token,
      personId,
      username,
      instagramId: ig.instagramId,
      ownUsername: ig.ownUsername,
    });
    if (!avatar) continue;
    await fillSupportChatConversationAvatar(row.accountId, row.externalThreadId, avatar);
  }
}

export async function backfillSupportChatPostSources() {
  const rows = (await listSupportChatConversationsMissingSource()).slice(0, 4);
  for (const row of rows) {
    if (!isSupportChatChannel(row.channel)) continue;
    const creds = credentialsMap(row.credentialsJson);
    const source = await resolveSocialPostSource({
      channel: row.channel,
      token: creds.pageAccessToken || creds.userAccessToken || "",
      pageId: creds.pageId || row.accountExternalId || "",
      postId: "",
      commentId: row.externalThreadId,
      permalink: row.sourceUrl ?? "",
    });
    if (!source) continue;
    await updateSupportChatConversationSource(row.id, source);
  }
}

type InstagramComment = {
  id?: string;
  text?: string;
  username?: string;
  timestamp?: string;
  from?: { id?: string; username?: string };
  replies?: { data?: InstagramComment[] };
};

type InstagramMedia = {
  id?: string;
  caption?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  comments?: { data?: InstagramComment[] };
};

function instagramCommentAuthor(comment: InstagramComment) {
  return comment.from?.username || comment.username || comment.from?.id || "Yorum";
}

async function ingestInstagramComment(input: {
  accountId: string;
  igIds: Set<string>;
  comment: InstagramComment;
  threadId: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceImage: string | null;
}) {
  const commentId = input.comment.id?.trim() ?? "";
  if (!commentId) return 0;
  const sentAt = graphSentAt(input.comment.timestamp);
  if (!sentAt) return 0;
  const fromId = input.comment.from?.id ?? "";
  const username = instagramCommentAuthor(input.comment);
  const result = await ingestSupportChatMessage({
    accountId: input.accountId,
    channel: "INSTAGRAM_POST",
    externalThreadId: input.threadId,
    customerName: username,
    customerHandle: username.startsWith("@") ? username : `@${username.replace(/^@/, "")}`,
    customerAvatar: null,
    body: (input.comment.text ?? "").trim() || "[yorum]",
    direction: fromId && input.igIds.has(fromId) ? "OUT" : "IN",
    externalId: commentId,
    sentAt,
    media: [],
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle,
    sourceImage: input.sourceImage,
    origin: "history",
  });
  return "ok" in result && !result.duplicate ? 1 : 0;
}

async function syncInstagramAccountComments(
  account: {
    id: string;
    externalId: string;
    credentials: Record<string, string>;
  },
  instagramId: string,
  token: string,
) {
  const payload = await graphGet<{ data?: InstagramMedia[] }>(
    `/${instagramId}/media`,
    token,
    {
      limit: "12",
      fields:
        "id,caption,permalink,media_url,thumbnail_url,comments.limit(15){id,text,username,timestamp,from,replies.limit(10){id,text,username,timestamp,from}}",
    },
    { retries: 1, timeoutMs: 8_000 },
  );
  const igIds = new Set(
    [instagramId, account.externalId, account.credentials.instagramId].filter(Boolean),
  );
  const commentIds: string[] = [];
  for (const media of payload.data ?? []) {
    for (const comment of media.comments?.data ?? []) {
      if (comment.id) commentIds.push(comment.id);
      for (const reply of comment.replies?.data ?? []) {
        if (reply.id) commentIds.push(reply.id);
      }
    }
  }
  const threadIds = (payload.data ?? []).flatMap((media) =>
    (media.comments?.data ?? []).flatMap((comment) => (comment.id?.trim() ? [comment.id.trim()] : [])),
  );
  const [known, existing, blocked, ignored, watermark] = await Promise.all([
    listKnownSupportChatExternalIds(commentIds),
    listExistingSupportChatThreadIds(account.id, threadIds),
    listBlockedSupportChatThreads(account.id, threadIds),
    listIgnoredSupportChatExternalIds(commentIds),
    readSupportChatHistoryWatermark(account.id),
  ]);
  const sourceCache = new Map<string, { url: string | null; title: string | null; image: string | null }>();
  let ingested = 0;
  let newestSeen: Date | null = watermark;
  function shouldTakeComment(
    id: string | undefined,
    timestamp: string | undefined,
    threadId: string,
  ) {
    const externalId = id?.trim() ?? "";
    if (!externalId || known.has(externalId) || ignored.has(externalId)) return null;
    const sentAt = graphSentAt(timestamp);
    if (!sentAt) return null;
    const cutoff = blocked.get(threadId) ?? null;
    if (isSupportChatBeforeThreadCutoff(sentAt, cutoff)) return null;
    if (!cutoff && isSupportChatHistoryTooOld(sentAt)) return null;
    if (!cutoff && existing.has(threadId) && isSupportChatBeforeHistoryWatermark(sentAt, watermark)) {
      return null;
    }
    return sentAt;
  }
  for (const media of payload.data ?? []) {
    const mediaId = media.id?.trim() ?? "";
    const comments = media.comments?.data ?? [];
    if (!mediaId || comments.length === 0) continue;
    const fresh = comments.some((comment) => {
      const threadId = comment.id?.trim() ?? "";
      if (!threadId) return false;
      if (shouldTakeComment(comment.id, comment.timestamp, threadId)) return true;
      return (comment.replies?.data ?? []).some((reply) =>
        Boolean(shouldTakeComment(reply.id, reply.timestamp, threadId)),
      );
    });
    if (!fresh) continue;
    let source = sourceCache.get(mediaId);
    if (!source) {
      const stored = media.permalink
        ? await materializeKnownPostSource({
            token,
            url: media.permalink,
            title: media.caption ?? "",
            image: media.media_url || media.thumbnail_url || "",
          })
        : null;
      source = {
        url: stored?.url ?? media.permalink ?? null,
        title: stored?.title ?? null,
        image: stored?.image ?? null,
      };
      sourceCache.set(mediaId, source);
    }
    const sourceUrl = source.url;
    const sourceTitle = source.title;
    const sourceImage = source.image;
    for (const comment of comments) {
      const threadId = comment.id?.trim() ?? "";
      if (!threadId) continue;
      const commentAt = shouldTakeComment(comment.id, comment.timestamp, threadId);
      if (commentAt) {
        if (!newestSeen || commentAt.getTime() > newestSeen.getTime()) newestSeen = commentAt;
        ingested += await ingestInstagramComment({
          accountId: account.id,
          igIds,
          comment,
          threadId,
          sourceUrl,
          sourceTitle,
          sourceImage,
        });
      }
      for (const reply of comment.replies?.data ?? []) {
        const replyAt = shouldTakeComment(reply.id, reply.timestamp, threadId);
        if (!replyAt) continue;
        if (!newestSeen || replyAt.getTime() > newestSeen.getTime()) newestSeen = replyAt;
        ingested += await ingestInstagramComment({
          accountId: account.id,
          igIds,
          comment: reply,
          threadId,
          sourceUrl,
          sourceTitle,
          sourceImage,
        });
      }
    }
  }
  if (newestSeen) await writeSupportChatHistoryWatermark(account.id, newestSeen);
  return ingested;
}

export async function syncInstagramPostComments() {
  const accounts = await listActiveSupportChatAccounts();
  const seen = new Set<string>();
  let ingested = 0;
  for (const account of accounts) {
    if (account.channel !== "INSTAGRAM_POST") continue;
    const instagramId = account.credentials.instagramId || account.externalId;
    const token = account.credentials.pageAccessToken;
    if (!instagramId || !token || seen.has(instagramId)) continue;
    seen.add(instagramId);
    try {
      ingested += await syncInstagramAccountComments(account, instagramId, token);
    } catch (error) {
      console.warn(
        "support-chat: instagram comment sync failed",
        instagramId,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return ingested;
}

export async function syncMetaMessengerConversations() {
  const accounts = await listActiveSupportChatAccounts();
  const seen = new Set<string>();
  let ingested = 0;
  for (const account of accounts) {
    if (account.channel !== "FACEBOOK_MESSENGER") continue;
    const pageId = account.credentials.pageId || account.externalId;
    const token = account.credentials.pageAccessToken;
    if (!pageId || !token || seen.has(pageId)) continue;
    seen.add(pageId);
    try {
      ingested += await syncGraphConversations(account, pageId, token, "FACEBOOK_MESSENGER", "MESSENGER");
    } catch (error) {
      console.warn(
        "support-chat: messenger sync failed",
        pageId,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return ingested;
}

export async function syncInstagramDirectMessages() {
  const accounts = await listActiveSupportChatAccounts();
  const seen = new Set<string>();
  let ingested = 0;
  for (const account of accounts) {
    if (account.channel !== "INSTAGRAM_DM") continue;
    const instagramId =
      account.credentials.instagramId || account.credentials.pageId || account.externalId;
    const token = account.credentials.pageAccessToken;
    if (!instagramId || !token || seen.has(instagramId)) continue;
    seen.add(instagramId);
    try {
      ingested += await syncGraphConversations(account, instagramId, token, "INSTAGRAM_DM", "INSTAGRAM");
    } catch (error) {
      console.warn(
        "support-chat: instagram dm sync failed",
        instagramId,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return ingested;
}

let lastMessengerSyncAt = 0;
let lastBackfillAt = 0;
let syncInFlight: Promise<number> | null = null;

async function runMetaInboxSync() {
  try {
    const [messenger, instagramDm, instagram] = await Promise.all([
      syncMetaMessengerConversations(),
      syncInstagramDirectMessages(),
      syncInstagramPostComments(),
    ]);
    return messenger + instagramDm + instagram;
  } catch (error) {
    console.warn("support-chat: messenger sync failed", error instanceof Error ? error.message : error);
    return 0;
  }
}

function startSlowInboxBackfill(minIntervalMs = 180_000) {
  const now = Date.now();
  if (now - lastBackfillAt < minIntervalMs) return;
  lastBackfillAt = now;
  void backfillSupportChatPostSources()
    .then(() => backfillSupportChatAvatars())
    .then(() => {
      startSupportChatCustomerBackfill();
    })
    .catch((error) => {
      console.warn("support-chat: inbox backfill failed", error instanceof Error ? error.message : error);
    });
}

export function startMetaInboxSync(minIntervalMs = 15_000) {
  const now = Date.now();
  if (syncInFlight || now - lastMessengerSyncAt < minIntervalMs) return;
  lastMessengerSyncAt = now;
  startSlowInboxBackfill();
  syncInFlight = runMetaInboxSync().finally(() => {
    syncInFlight = null;
  });
}

export async function syncMetaMessengerConversationsThrottled(minIntervalMs = 60_000) {
  startMetaInboxSync(minIntervalMs);
  return 0;
}
