"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { isSupportChatChannel, isSupportChatFolder, supportChatKindFromFile, type SupportChatMediaItem } from "@/modules/support-chat/kinds";
import {
  assignSupportChatConversation,
  reassignSupportChatConversation,
  bulkArchiveOwnSupportChatConversations,
  bulkMarkOwnSupportChatConversationsRead,
  bulkUnassignOwnSupportChatConversations,
  createSupportChatAccount,
  createSupportChatDepartment,
  createSupportChatReply,
  createSupportChatTag,
  deleteSupportChatDepartment,
  deleteSupportChatAccount,
  deleteSupportChatReply,
  deleteSupportChatTag,
  emptySupportChatTrash,
  permanentlyDeleteSupportChatConversations,
  findSupportChatQuotedMessage,
  getSupportChatSendContext,
  ingestSupportChatMessage,
  listSupportChatConversations,
  listSupportChatMessages,
  markSupportChatConversationRead,
  searchWhatsAppRecipients,
  setSupportChatAccountDepartment,
  setSupportChatAccountStatus,
  setSupportChatConversationDepartment,
  setSupportChatConversationFolder,
  unassignSupportChatConversation,
  updateSupportChatDepartment,
  upsertSupportChatAccount,
} from "@/modules/support-chat/db";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { saveSupportChatMetaConfig } from "@/modules/support-chat/meta-config";
import { sendSupportChatViaMeta } from "@/modules/support-chat/meta-send";
import {
  deleteSupportChatUploadedFiles,
  isSupportChatSendableKind,
  saveSupportChatMediaFile,
  toSupportChatMediaItem,
  type SupportChatOutboundMedia,
} from "@/modules/support-chat/media";
import {
  channelsForMetaPick,
  deleteMetaOAuthSession,
  ensureActiveMetaPageSubscriptions,
  loadMetaOAuthSession,
  subscribeAppMetaWebhooks,
  subscribeMetaAssets,
} from "@/modules/support-chat/meta-oauth";
import { getSupportChatCustomerProfile } from "@/modules/support-chat/customer-profiles";
import { startMetaInboxSync } from "@/modules/support-chat/meta-sync";
import {
  activateSupportChatLicense,
  deactivateSupportChatLicense,
  issueSupportChatLicenseKey,
} from "@/modules/support-chat/license";
import { requireAdmin, requirePermission } from "@/lib/staff-permissions";
import { saveWebChatAppearance } from "@/modules/support-chat/web-chat-settings";
import { isWebChatIcon, isWebChatPosition } from "@/modules/support-chat/web-chat-appearance";
import { parseSupportChatAutoReplies } from "@/modules/support-chat/auto-replies";
import { saveSupportChatAutoReplies } from "@/modules/support-chat/auto-replies-store";
import { parseSupportChatWorkingHours } from "@/modules/support-chat/working-hours";
import { saveSupportChatWorkingHours } from "@/modules/support-chat/working-hours-store";
import { listApprovedWhatsAppTemplates, sendApprovedWhatsAppTemplate } from "@/modules/support-chat/whatsapp-templates";

function revalidateSupport() {
  revalidatePath("/admin/settings/support", "layout");
  revalidatePath("/admin/support", "layout");
}

export async function saveSupportChatWebSettingsAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  const icon = String(formData.get("icon") ?? "");
  const position = String(formData.get("position") ?? "");
  const result = await saveWebChatAppearance({
    enabled: formData.get("enabled") === "1",
    membership: formData.get("membership") === "1",
    attachmentsEnabled: formData.get("attachmentsEnabled") === "1",
    icon: isWebChatIcon(icon) ? icon : undefined,
    teaserEnabled: formData.get("teaserEnabled") === "1",
    teaserText: String(formData.get("teaserText") ?? ""),
    teaserGuestText: String(formData.get("teaserGuestText") ?? ""),
    showAgentName: formData.get("showAgentName") === "1",
    greeting: String(formData.get("greeting") ?? ""),
    position: isWebChatPosition(position) ? position : undefined,
  });
  revalidateSupport();
  return result;
}

export async function saveSupportChatWorkingHoursAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  const hours = parseSupportChatWorkingHours(String(formData.get("hours") ?? ""));
  const result = await saveSupportChatWorkingHours(hours);
  revalidateSupport();
  return result;
}

export async function saveSupportChatAutoRepliesAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  const settings = parseSupportChatAutoReplies(String(formData.get("settings") ?? ""));
  const result = await saveSupportChatAutoReplies(settings);
  revalidateSupport();
  return result;
}

export async function activateSupportChatLicenseAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const key = String(formData.get("licenseKey") ?? "");
  const result = await activateSupportChatLicense(key);
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function issueAndActivateSupportChatLicenseAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  try {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const key = issueSupportChatLicenseKey(expiresAt);
    const result = await activateSupportChatLicense(key);
    if ("error" in result) return result;
    revalidateSupport();
    return { ok: true as const, licenseKey: key };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Lisans üretilemedi." };
  }
}

export async function deactivateSupportChatLicenseAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };
  const result = await deactivateSupportChatLicense();
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function saveSupportChatMetaConfigAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await saveSupportChatMetaConfig({
    appId: String(formData.get("appId") ?? ""),
    appSecret: String(formData.get("appSecret") ?? ""),
    configId: String(formData.get("configId") ?? ""),
    callbackUrl: String(formData.get("callbackUrl") ?? ""),
    webhookUrl: String(formData.get("webhookUrl") ?? ""),
    preserveSecret: String(formData.get("appSecret") ?? "").trim().length === 0,
  });
  if ("error" in result) return result;
  await subscribeAppMetaWebhooks().catch(() => undefined);
  revalidateSupport();
  return { ok: true as const };
}

export async function connectSupportChatMetaAssetsAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = gate.session.user?.id;
  if (!sessionId || !userId) return { error: "Meta oturumu bulunamadı." };
  const session = await loadMetaOAuthSession(sessionId, userId);
  if (!session) return { error: "Meta seçim oturumu doldu. Tekrar bağlanın." };
  const pickIds = new Set(formData.getAll("pickId").map((value) => String(value)));
  const selected = session.assets.filter((asset) => pickIds.has(asset.pickId));
  if (selected.length === 0) return { error: "En az bir hesap seçin." };
  try {
    for (const asset of selected) {
      const credentialsJson = JSON.stringify(asset.credentials);
      for (const channel of channelsForMetaPick(asset)) {
        const result = await upsertSupportChatAccount({
          channel,
          name: asset.name,
          externalId: asset.externalId,
          credentialsJson,
        });
        if ("error" in result) return result;
      }
    }
    await subscribeMetaAssets(selected);
    await ensureActiveMetaPageSubscriptions(true);
    await deleteMetaOAuthSession(sessionId);
    revalidateSupport();
    return { ok: true as const };
  } catch {
    return { error: "Seçilen hesaplar kaydedilemedi." };
  }
}

export async function createSupportChatAccountAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const channel = String(formData.get("channel") ?? "");
  if (!isSupportChatChannel(channel)) return { error: "Kanal seçin." };
  const result = await createSupportChatAccount({
    channel,
    name: String(formData.get("name") ?? ""),
    externalId: String(formData.get("externalId") ?? ""),
    departmentId: String(formData.get("departmentId") ?? ""),
  });
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function setSupportChatAccountDepartmentAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await setSupportChatAccountDepartment(
    String(formData.get("id") ?? ""),
    String(formData.get("departmentId") ?? ""),
  );
  if ("error" in result) return result;
  revalidateSupport();
  return result;
}

export async function toggleSupportChatAccountAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "DISABLED" ? "DISABLED" : "ACTIVE";
  const result = await setSupportChatAccountStatus(id, status);
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function deleteSupportChatAccountAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await deleteSupportChatAccount(String(formData.get("id") ?? ""));
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function createSupportChatTagAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await createSupportChatTag({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#405189"),
  });
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function deleteSupportChatTagAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await deleteSupportChatTag(String(formData.get("id") ?? ""));
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function createSupportChatDepartmentAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await createSupportChatDepartment({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#405189"),
  });
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function updateSupportChatDepartmentAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await updateSupportChatDepartment({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#405189"),
  });
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function deleteSupportChatDepartmentAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await deleteSupportChatDepartment(String(formData.get("id") ?? ""));
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function createSupportChatReplyAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await createSupportChatReply({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function deleteSupportChatReplyAction(formData: FormData) {
  const gate = await requirePermission("settings_support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await deleteSupportChatReply(String(formData.get("id") ?? ""));
  if ("error" in result) return result;
  revalidateSupport();
  return { ok: true as const };
}

export async function loadSupportChatInboxAction() {
  const gate = await requirePermission("support", "view");
  if (!gate.ok) return { error: gate.error, conversations: [] };
  try {
    after(() => {
      startMetaInboxSync();
    });
    const conversations = await listSupportChatConversations();
    return { conversations };
  } catch {
    return { error: "Gelen kutusu okunamadı.", conversations: [] };
  }
}

export async function getSupportChatCustomerProfileAction(conversationId: string) {
  const gate = await requirePermission("support", "view");
  if (!gate.ok) return { error: gate.error };
  try {
    const profile = await getSupportChatCustomerProfile(conversationId);
    if (!profile) return { error: "Müşteri profili bulunamadı." };
    return { profile };
  } catch {
    return { error: "Müşteri profili okunamadı." };
  }
}

export async function listSupportChatMessagesAction(conversationId: string) {
  const gate = await requirePermission("support", "view");
  if (!gate.ok) return [];
  try {
    return await listSupportChatMessages(conversationId);
  } catch {
    return [];
  }
}

export async function markSupportChatConversationReadAction(conversationId: string) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  return markSupportChatConversationRead(conversationId);
}

export async function setSupportChatConversationFolderAction(conversationId: string, folder: string) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  if (!isSupportChatFolder(folder)) return { error: "Klasör geçersiz." };
  const result = await setSupportChatConversationFolder(conversationId, folder);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return { ok: true as const };
}

export async function permanentlyDeleteSupportChatConversationAction(conversationId: string) {
  const gate = await requirePermission("support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await permanentlyDeleteSupportChatConversations([conversationId]);
  if ("error" in result) return result;
  await deleteSupportChatUploadedFiles(result.mediaSrcs);
  revalidatePath("/admin/support", "layout");
  return { ok: true as const, deleted: result.deleted };
}

export async function emptySupportChatTrashAction() {
  const gate = await requirePermission("support", "delete");
  if (!gate.ok) return { error: gate.error };
  const result = await emptySupportChatTrash();
  if ("error" in result) return result;
  await deleteSupportChatUploadedFiles(result.mediaSrcs);
  revalidatePath("/admin/support", "layout");
  return { ok: true as const, deleted: result.deleted };
}

export async function assignSupportChatConversationAction(conversationId: string, userId: string) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await reassignSupportChatConversation(conversationId, userId);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function setSupportChatConversationDepartmentAction(
  conversationId: string,
  departmentId: string,
) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await setSupportChatConversationDepartment(conversationId, departmentId || null);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function unassignSupportChatConversationAction(conversationId: string) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await unassignSupportChatConversation(conversationId);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return { ok: true as const };
}

export async function bulkUnassignOwnSupportChatAction() {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const userId = gate.session.user?.id;
  if (!userId) return { error: "Oturum bulunamadı." };
  const result = await bulkUnassignOwnSupportChatConversations(userId);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function bulkArchiveOwnSupportChatAction() {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const userId = gate.session.user?.id;
  if (!userId) return { error: "Oturum bulunamadı." };
  const result = await bulkArchiveOwnSupportChatConversations(userId);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function bulkMarkOwnSupportChatReadAction() {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const userId = gate.session.user?.id;
  if (!userId) return { error: "Oturum bulunamadı." };
  const result = await bulkMarkOwnSupportChatConversationsRead(userId);
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function listWhatsAppTemplatesAction() {
  const gate = await requirePermission("support", "view");
  if (!gate.ok) return { error: gate.error };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  return listApprovedWhatsAppTemplates();
}

export async function searchWhatsAppRecipientsAction(query: string) {
  const gate = await requirePermission("support", "view");
  if (!gate.ok) return { error: gate.error };
  return { ok: true as const, hits: await searchWhatsAppRecipients(query) };
}

export async function sendWhatsAppTemplateAction(input: {
  to: string;
  customerName?: string;
  templateId: string;
  values: Record<string, string>;
}) {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const userId = gate.session.user?.id;
  if (!userId) return { error: "Oturum bulunamadı." };
  const licensed = await isSupportChatLicensed().catch(() => false);
  if (!licensed) return { error: "Sohbet modülü lisanslı değil." };
  const result = await sendApprovedWhatsAppTemplate({
    to: input.to,
    customerName: input.customerName,
    templateId: input.templateId,
    values: input.values,
    userId,
  });
  if ("error" in result) return result;
  revalidatePath("/admin/support", "layout");
  return result;
}

export async function sendSupportChatMessageAction(
  formData: FormData,
): Promise<{ ok: true; assigned: boolean } | { error: string }> {
  const gate = await requirePermission("support", "update");
  if (!gate.ok) return { error: gate.error };
  const userId = gate.session.user?.id;
  if (!userId) return { error: "Oturum bulunamadı." };
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const text = String(formData.get("body") ?? "").trim();
  const quotedMessageId = String(formData.get("quotedMessageId") ?? "").trim() || null;
  const uploaded = formData.get("file");
  const file =
    uploaded && typeof uploaded === "object" && "arrayBuffer" in uploaded && "size" in uploaded
      ? (uploaded as File)
      : null;

  let outbound: SupportChatOutboundMedia | null = null;
  let storedMedia: SupportChatMediaItem | null = null;
  if (file && file.size > 0) {
    const mime = file.type || "application/octet-stream";
    const kind = supportChatKindFromFile(mime, file.name);
    if (!isSupportChatSendableKind(kind)) {
      return { error: "Yalnızca görsel, video veya ses gönderilebilir." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveSupportChatMediaFile({
      buffer,
      mime,
      fileName: file.name,
      kind,
    });
    if ("error" in saved) return { error: saved.error };
    storedMedia = toSupportChatMediaItem(saved);
    outbound = {
      kind,
      mime: saved.mime,
      fileName: saved.fileName,
      buffer: saved.buffer,
      voiceNote: String(formData.get("voiceNote") ?? "") === "1" && kind === "audio",
    };
  }
  if (!text && !outbound) return { error: "Mesaj yazın veya dosya ekleyin." };
  const context = await getSupportChatSendContext(conversationId);
  if (!context) return { error: "Konuşma bulunamadı." };
  if (context.accountStatus !== "ACTIVE") return { error: "Kanal hesabı kapalı." };
  if (context.folder === "TRASH") return { error: "Çöp kutusundaki konuşmaya mesaj gönderilemez." };
  const quote = quotedMessageId
    ? await findSupportChatQuotedMessage({ conversationId, messageId: quotedMessageId })
    : null;
  const sent = await sendSupportChatViaMeta({
    channel: context.channel,
    credentials: context.credentials,
    threadId: context.externalThreadId,
    text,
    quotedExternalId: quote?.externalId,
    media: outbound,
  });
  if (!("ok" in sent)) return { error: sent.error };
  const ingested = await ingestSupportChatMessage({
    accountId: context.accountId,
    channel: context.channel,
    externalThreadId: context.externalThreadId,
    customerName: context.customerName,
    customerHandle: null,
    customerAvatar: null,
    body: text,
    direction: "OUT",
    externalId: sent.externalId,
    sentAt: new Date(),
    quote,
    media: storedMedia ? [storedMedia] : [],
  });
  if ("error" in ingested) return { error: "Mesaj kaydedilemedi." };
  if (!context.assignedUserId) {
    await assignSupportChatConversation(conversationId, userId);
  }
  revalidatePath("/admin/support", "layout");
  return { ok: true as const, assigned: !context.assignedUserId };
}

