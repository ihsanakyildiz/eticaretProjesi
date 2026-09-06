import "server-only";

import { META_GRAPH_VERSION } from "@/modules/support-chat/meta-oauth";
import type { SupportChatChannel } from "@/modules/support-chat/kinds";
import { prepareSupportChatGraphMedia, type SupportChatOutboundMedia } from "@/modules/support-chat/media";
import type { WhatsAppTemplateView } from "@/modules/support-chat/whatsapp-template";

type GraphError = { error?: { message?: string } };

async function graphSend(path: string, token: string, body: Record<string, unknown>) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await response.json()) as GraphError & { message_id?: string; id?: string };
  if (!response.ok || json.error?.message) {
    throw new Error(json.error?.message || `Meta gönderim hatası (${response.status})`);
  }
  return json.message_id || json.id || null;
}

async function graphSendForm(path: string, token: string, form: FormData) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const json = (await response.json()) as GraphError & { message_id?: string; id?: string };
  if (!response.ok || json.error?.message) {
    throw new Error(json.error?.message || `Meta gönderim hatası (${response.status})`);
  }
  return json.message_id || json.id || null;
}

function blobFromMedia(media: SupportChatOutboundMedia) {
  return new Blob([new Uint8Array(media.buffer)], { type: media.mime });
}

function whatsappMediaType(kind: SupportChatOutboundMedia["kind"]) {
  switch (kind) {
    case "image":
      return "image" as const;
    case "video":
      return "video" as const;
    case "audio":
      return "audio" as const;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function messengerAttachmentType(kind: SupportChatOutboundMedia["kind"]) {
  switch (kind) {
    case "image":
      return "image" as const;
    case "video":
      return "video" as const;
    case "audio":
      return "audio" as const;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

async function uploadWhatsAppMedia(
  phoneNumberId: string,
  token: string,
  media: SupportChatOutboundMedia,
) {
  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", media.mime);
  form.set("file", blobFromMedia(media), media.fileName);
  const id = await graphSendForm(`/${phoneNumberId}/media`, token, form);
  if (!id) throw new Error("WhatsApp medya yüklenemedi.");
  return id;
}

async function sendMessengerAttachment(input: {
  path: string;
  token: string;
  threadId: string;
  media: SupportChatOutboundMedia;
  quotedExternalId: string;
  messagingType?: string;
}) {
  const form = new FormData();
  form.set("recipient", JSON.stringify({ id: input.threadId }));
  if (input.messagingType) form.set("messaging_type", input.messagingType);
  const message: Record<string, unknown> = {
    attachment: {
      type: messengerAttachmentType(input.media.kind),
      payload: { is_reusable: false },
    },
  };
  if (input.quotedExternalId) message.reply_to = { mid: input.quotedExternalId };
  form.set("message", JSON.stringify(message));
  form.set("filedata", blobFromMedia(input.media), input.media.fileName);
  return graphSendForm(input.path, input.token, form);
}

function templateTextParams(template: WhatsAppTemplateView, component: "header" | "body", values: Record<string, string>) {
  return template.variables
    .filter((item) => item.component === component)
    .sort((left, right) => left.index - right.index)
    .map((item) => {
      const text = values[item.id]?.trim() || item.example || " ";
      if (item.named) return { type: "text", parameter_name: item.slot, text };
      return { type: "text", text };
    });
}

export async function sendWhatsAppTemplateViaMeta(input: {
  credentials: Record<string, string>;
  to: string;
  template: WhatsAppTemplateView;
  values: Record<string, string>;
}): Promise<{ ok: true; externalId: string | null } | { error: string }> {
  const phoneNumberId = input.credentials.phoneNumberId;
  const token = input.credentials.userAccessToken || input.credentials.pageAccessToken;
  if (!phoneNumberId || !token) return { error: "WhatsApp hesabı eksik." };
  const components: Array<Record<string, unknown>> = [];
  const headerParams = templateTextParams(input.template, "header", input.values);
  if (headerParams.length > 0) {
    components.push({ type: "header", parameters: headerParams });
  }
  const bodyParams = templateTextParams(input.template, "body", input.values);
  if (bodyParams.length > 0) {
    components.push({ type: "body", parameters: bodyParams });
  }
  for (const button of input.template.variables.filter((item) => item.component === "button")) {
    const text = input.values[button.id]?.trim();
    if (!text) continue;
    components.push({
      type: "button",
      sub_type: "url",
      index: String(button.index),
      parameters: [{ type: "text", text }],
    });
  }
  try {
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.template.name,
        language: { code: input.template.language },
        ...(components.length > 0 ? { components } : {}),
      },
    };
    const externalId = await graphSend(`/${phoneNumberId}/messages`, token, payload);
    return { ok: true as const, externalId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Şablon gönderilemedi." };
  }
}

export async function sendSupportChatViaMeta(input: {
  channel: SupportChatChannel;
  credentials: Record<string, string>;
  threadId: string;
  text: string;
  quotedExternalId?: string | null;
  media?: SupportChatOutboundMedia | null;
}): Promise<{ ok: true; externalId: string | null } | { error: string }> {
  const text = input.text.trim();
  const threadId = input.threadId.trim();
  const quotedExternalId = input.quotedExternalId?.trim() || "";
  const media = input.media
    ? await prepareSupportChatGraphMedia(input.media, input.channel)
    : null;
  if ((!text && !media) || !threadId) return { error: "Mesaj veya medya gerekli." };

  try {
    switch (input.channel) {
      case "WHATSAPP": {
        const phoneNumberId = input.credentials.phoneNumberId;
        const token = input.credentials.userAccessToken || input.credentials.pageAccessToken;
        if (!phoneNumberId || !token) return { error: "WhatsApp hesabı eksik." };
        if (media) {
          const mediaId = await uploadWhatsAppMedia(phoneNumberId, token, media);
          const waType = whatsappMediaType(media.kind);
          const mediaBody =
            waType === "audio"
              ? { id: mediaId, ...(media.voiceNote ? { voice: true } : {}) }
              : { id: mediaId, caption: text || undefined };
          const payload: Record<string, unknown> = {
            messaging_product: "whatsapp",
            to: threadId,
            type: waType,
            [waType]: mediaBody,
          };
          if (quotedExternalId) payload.context = { message_id: quotedExternalId };
          const externalId = await graphSend(`/${phoneNumberId}/messages`, token, payload);
          if (waType === "audio" && text) {
            const follow: Record<string, unknown> = {
              messaging_product: "whatsapp",
              to: threadId,
              type: "text",
              text: { body: text },
            };
            await graphSend(`/${phoneNumberId}/messages`, token, follow);
          }
          return { ok: true as const, externalId };
        }
        const payload: Record<string, unknown> = {
          messaging_product: "whatsapp",
          to: threadId,
          type: "text",
          text: { body: text },
        };
        if (quotedExternalId) payload.context = { message_id: quotedExternalId };
        const externalId = await graphSend(`/${phoneNumberId}/messages`, token, payload);
        return { ok: true as const, externalId };
      }
      case "FACEBOOK_MESSENGER": {
        const pageId = input.credentials.pageId;
        const token = input.credentials.pageAccessToken;
        if (!pageId || !token) return { error: "Facebook sayfası eksik." };
        if (media) {
          const externalId = await sendMessengerAttachment({
            path: `/${pageId}/messages`,
            token,
            threadId,
            media,
            quotedExternalId,
            messagingType: "RESPONSE",
          });
          if (text) {
            await graphSend(`/${pageId}/messages`, token, {
              recipient: { id: threadId },
              messaging_type: "RESPONSE",
              message: { text },
            });
          }
          return { ok: true as const, externalId };
        }
        const message: Record<string, unknown> = { text };
        if (quotedExternalId) message.reply_to = { mid: quotedExternalId };
        const externalId = await graphSend(`/${pageId}/messages`, token, {
          recipient: { id: threadId },
          messaging_type: "RESPONSE",
          message,
        });
        return { ok: true as const, externalId };
      }
      case "INSTAGRAM_DM": {
        const igId = input.credentials.instagramId;
        const token = input.credentials.pageAccessToken;
        if (!igId || !token) return { error: "Instagram hesabı eksik." };
        if (media) {
          const externalId = await sendMessengerAttachment({
            path: `/${igId}/messages`,
            token,
            threadId,
            media,
            quotedExternalId,
          });
          if (text) {
            await graphSend(`/${igId}/messages`, token, {
              recipient: { id: threadId },
              message: { text },
            });
          }
          return { ok: true as const, externalId };
        }
        const message: Record<string, unknown> = { text };
        if (quotedExternalId) message.reply_to = { mid: quotedExternalId };
        const externalId = await graphSend(`/${igId}/messages`, token, {
          recipient: { id: threadId },
          message,
        });
        return { ok: true as const, externalId };
      }
      case "FACEBOOK_POST":
      case "INSTAGRAM_POST":
        return { error: "Gönderi yorumuna yanıtlama henüz yok." };
      case "WEB":
        return { ok: true as const, externalId: `web-out-${crypto.randomUUID()}` };
      case "TELEGRAM":
      case "TIKTOK":
        return { error: "Bu kanal henüz gönderim desteklemiyor." };
      default: {
        const _exhaustive: never = input.channel;
        return _exhaustive;
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Mesaj gönderilemedi." };
  }
}
