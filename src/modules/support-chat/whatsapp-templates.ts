import "server-only";

import {
  assignSupportChatConversation,
  ingestSupportChatMessage,
  listActiveSupportChatAccounts,
} from "@/modules/support-chat/db";
import { graphGet } from "@/modules/support-chat/meta-oauth";
import { sendWhatsAppTemplateViaMeta } from "@/modules/support-chat/meta-send";
import {
  buildWhatsAppTemplateView,
  fillWhatsAppTemplatePreview,
  normalizeWhatsAppTo,
  whatsappTemplateValuesComplete,
  type WhatsAppTemplateView,
} from "@/modules/support-chat/whatsapp-template";

type GraphTemplate = {
  name?: string;
  language?: string | { code?: string };
  status?: string;
  category?: string;
  components?: Array<{
    type?: string;
    format?: string;
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
      header_text_named_params?: Array<{ param_name?: string; example?: string }>;
      body_text_named_params?: Array<{ param_name?: string; example?: string }>;
    };
    buttons?: Array<{ type?: string; text?: string; url?: string }>;
  }>;
};

function languageCode(value: GraphTemplate["language"]) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && value.code?.trim()) return value.code.trim();
  return "tr";
}

function firstWhatsAppAccount() {
  return listActiveSupportChatAccounts().then(
    (accounts) => accounts.find((account) => account.channel === "WHATSAPP") ?? null,
  );
}

export async function listApprovedWhatsAppTemplates(): Promise<
  { ok: true; templates: WhatsAppTemplateView[] } | { error: string }
> {
  const account = await firstWhatsAppAccount();
  if (!account) return { error: "WhatsApp hesabı bağlı değil." };
  const wabaId = account.credentials.wabaId;
  const token = account.credentials.userAccessToken || account.credentials.pageAccessToken;
  if (!wabaId || !token) return { error: "WhatsApp Business hesabı eksik. Meta’ya yeniden bağlanın." };
  try {
    const collected: GraphTemplate[] = [];
    let after = "";
    for (let page = 0; page < 5; page += 1) {
      const json = await graphGet<{
        data?: GraphTemplate[];
        paging?: { next?: string; cursors?: { after?: string } };
      }>(`/${wabaId}/message_templates`, token, {
        fields: "name,language,status,category,components",
        limit: "100",
        ...(after ? { after } : {}),
      });
      collected.push(...(json.data ?? []));
      after = json.paging?.cursors?.after ?? "";
      if (!json.paging?.next || !after) break;
    }
    const templates = collected
      .filter((row) => (row.status ?? "").toUpperCase() === "APPROVED" && row.name)
      .map((row) =>
        buildWhatsAppTemplateView({
          name: String(row.name),
          language: languageCode(row.language),
          category: row.category,
          components: row.components,
        }),
      )
      .sort((left, right) => left.name.localeCompare(right.name, "tr"));
    return { ok: true as const, templates };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Şablonlar alınamadı." };
  }
}

export async function sendApprovedWhatsAppTemplate(input: {
  to: string;
  customerName?: string;
  templateId: string;
  values: Record<string, string>;
  userId: string;
}): Promise<{ ok: true; conversationId: string } | { error: string }> {
  const phone = normalizeWhatsAppTo(input.to);
  if (!phone) return { error: "Geçerli bir telefon numarası yazın. Örnek: 905449032919" };
  const listed = await listApprovedWhatsAppTemplates();
  if ("error" in listed) return listed;
  const template = listed.templates.find((item) => item.id === input.templateId);
  if (!template) return { error: "Şablon bulunamadı." };
  if (!template.sendable) return { error: template.sendableHint || "Bu şablon gönderilemez." };
  if (!whatsappTemplateValuesComplete(template, input.values)) {
    return { error: "Şablondaki tüm değişkenleri doldurun." };
  }
  const account = await firstWhatsAppAccount();
  if (!account) return { error: "WhatsApp hesabı bağlı değil." };
  const preview = fillWhatsAppTemplatePreview(template, input.values);
  const sent = await sendWhatsAppTemplateViaMeta({
    credentials: account.credentials,
    to: phone,
    template,
    values: input.values,
  });
  if (!("ok" in sent)) return { error: sent.error };
  const body = [preview.header, preview.body, preview.footer].filter(Boolean).join("\n\n");
  const name = (input.customerName?.trim() || phone).slice(0, 191);
  const ingested = await ingestSupportChatMessage({
    accountId: account.id,
    channel: "WHATSAPP",
    externalThreadId: phone,
    customerName: name,
    customerHandle: phone,
    customerAvatar: null,
    body: body || `[Şablon] ${template.name}`,
    direction: "OUT",
    externalId: sent.externalId,
    sentAt: new Date(),
  });
  if (!("ok" in ingested) || !ingested.conversationId) {
    return { error: "Mesaj gönderildi fakat gelen kutusuna yazılamadı." };
  }
  const conversationId = ingested.conversationId;
  await assignSupportChatConversation(conversationId, input.userId);
  return { ok: true as const, conversationId: conversationId };
}
