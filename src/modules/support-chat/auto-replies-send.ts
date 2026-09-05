import "server-only";

import { prisma } from "@/lib/prisma";
import {
  pickSupportChatAutoReply,
  supportChatAutoReplyExternalId,
} from "@/modules/support-chat/auto-replies";
import { loadSupportChatAutoReplies } from "@/modules/support-chat/auto-replies-store";
import { getSupportChatSendContext, ingestSupportChatMessage } from "@/modules/support-chat/db";
import type { SupportChatChannel } from "@/modules/support-chat/kinds";
import { sendSupportChatViaMeta } from "@/modules/support-chat/meta-send";
import { loadSupportChatWorkingHours } from "@/modules/support-chat/working-hours-store";

function isSupportChatAutoReplyChannel(channel: SupportChatChannel) {
  switch (channel) {
    case "WHATSAPP":
    case "FACEBOOK_MESSENGER":
    case "INSTAGRAM_DM":
    case "WEB":
    case "TELEGRAM":
    case "TIKTOK":
      return true;
    case "FACEBOOK_POST":
    case "INSTAGRAM_POST":
      return false;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function persistWithoutRemoteDelivery(channel: SupportChatChannel) {
  switch (channel) {
    case "TELEGRAM":
    case "TIKTOK":
      return true;
    case "WHATSAPP":
    case "FACEBOOK_MESSENGER":
    case "INSTAGRAM_DM":
    case "WEB":
    case "FACEBOOK_POST":
    case "INSTAGRAM_POST":
      return false;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

async function countInboundMessages(conversationId: string) {
  const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
    SELECT COUNT(*) AS total
    FROM support_chat_messages
    WHERE conversationId = ${conversationId} AND direction = 'IN'
  `;
  return Number(rows[0]?.total ?? 0);
}

async function hasAutoReplyMarker(conversationId: string, autoReplyId: string) {
  const like = `%"autoReplyId":"${autoReplyId}"%`;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM support_chat_messages
    WHERE conversationId = ${conversationId}
      AND (externalId = ${autoReplyId} OR mediaJson LIKE ${like})
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

export async function maybeSendSupportChatAutoReply(conversationId: string) {
  try {
    const id = conversationId.trim();
    if (!id) return;
    const [settings, hours, context] = await Promise.all([
      loadSupportChatAutoReplies(),
      loadSupportChatWorkingHours(),
      getSupportChatSendContext(id),
    ]);
    if (!context || context.folder === "TRASH" || context.accountStatus !== "ACTIVE") return;
    if (!isSupportChatAutoReplyChannel(context.channel)) return;
    const picked = pickSupportChatAutoReply(settings, hours);
    if (!picked) return;
    if (picked.kind === "welcome") {
      const inbound = await countInboundMessages(id);
      if (inbound !== 1) return;
    }
    const autoReplyId = supportChatAutoReplyExternalId(picked.kind, id);
    if (await hasAutoReplyMarker(id, autoReplyId)) return;
    const sent = await sendSupportChatViaMeta({
      channel: context.channel,
      credentials: context.credentials,
      threadId: context.externalThreadId,
      text: picked.body,
    });
    if (!("ok" in sent) && !persistWithoutRemoteDelivery(context.channel)) return;
    const externalId = "ok" in sent && sent.externalId ? sent.externalId : autoReplyId;
    await ingestSupportChatMessage({
      accountId: context.accountId,
      channel: context.channel,
      externalThreadId: context.externalThreadId,
      customerName: context.customerName,
      customerHandle: null,
      customerAvatar: null,
      body: picked.body,
      direction: "OUT",
      externalId,
      autoReplyId,
      sentAt: new Date(),
    });
  } catch {
    /* inbound already stored */
  }
}
