import "server-only";

import { prisma } from "@/lib/prisma";
import { listActiveSupportChatAccounts } from "@/modules/support-chat/db";
import {
  supportChatChannelLabel,
  type SupportChatChannel,
} from "@/modules/support-chat/kinds";
import { loadSupportChatMetaConfig } from "@/modules/support-chat/meta-config";

export const META_GRAPH_VERSION = "v21.0";

export type MetaPickAsset = {
  pickId: string;
  group: "facebook" | "instagram" | "whatsapp";
  channel: SupportChatChannel;
  name: string;
  hint: string;
  externalId: string;
  credentials: Record<string, unknown>;
};

type GraphError = { error?: { message?: string } };

async function graphGetOnce<T>(
  path: string,
  token: string,
  search: Record<string, string> = {},
  timeoutMs = 15_000,
) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  if (token) url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  const json = (await response.json()) as T & GraphError;
  if (!response.ok || json.error?.message) {
    throw new Error(json.error?.message || `Meta Graph hatası (${response.status})`);
  }
  return json;
}

export async function graphGet<T>(
  path: string,
  token: string,
  search: Record<string, string> = {},
  options?: { retries?: number; timeoutMs?: number },
) {
  const retries = Math.max(1, options?.retries ?? 3);
  const timeoutMs = options?.timeoutMs ?? 15_000;
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await graphGetOnce<T>(path, token, search, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Meta Graph hatası");
}

export async function graphGetMaybe<T>(path: string, token: string, search: Record<string, string> = {}) {
  try {
    return await graphGetOnce<T>(path, token, search);
  } catch {
    return null;
  }
}

async function graphPost(path: string, token: string, search: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  const body = new URLSearchParams(search);
  if (token) body.set("access_token", token);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await response.json()) as GraphError & { success?: boolean };
  if (!response.ok || json.error?.message) {
    throw new Error(json.error?.message || `Meta Graph hatası (${response.status})`);
  }
}

export function metaOAuthScopes() {
  return [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "pages_read_engagement",
    "pages_manage_engagement",
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "business_management",
    "whatsapp_business_management",
    "whatsapp_business_messaging",
  ].join(",");
}

export function buildMetaOAuthUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  configId?: string;
}) {
  const url = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", metaOAuthScopes());
  url.searchParams.set("auth_type", "rerequest");
  if (input.configId) url.searchParams.set("config_id", input.configId);
  return url.toString();
}

export async function exchangeMetaOAuthCode(code: string, redirectUri: string) {
  const config = await loadSupportChatMetaConfig();
  const token = await graphGet<{ access_token: string; expires_in?: number }>(
    "/oauth/access_token",
    "",
    {
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: redirectUri,
      code,
    },
  );
  try {
    const longLived = await graphGet<{ access_token: string; expires_in?: number }>(
      "/oauth/access_token",
      "",
      {
        grant_type: "fb_exchange_token",
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: token.access_token,
      },
    );
    return {
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in ?? token.expires_in ?? 60 * 24 * 3600,
    };
  } catch {
    return { accessToken: token.access_token, expiresIn: token.expires_in ?? 3600 };
  }
}

type PageNode = {
  id: string;
  name: string;
  access_token?: string;
  global_brand_page_id?: string;
  instagram_business_account?: { id: string; username?: string; name?: string };
};

type BusinessNode = { id: string; name?: string };
type WabaNode = { id: string; name?: string };
type PhoneNode = { id: string; display_phone_number?: string; verified_name?: string };

export async function discoverMetaAssets(userToken: string): Promise<MetaPickAsset[]> {
  const assets: MetaPickAsset[] = [];
  const pages = await graphGet<{ data?: PageNode[] }>("/me/accounts", userToken, {
    fields: "id,name,access_token,global_brand_page_id,instagram_business_account{id,username,name}",
    limit: "100",
  }).catch(() => ({ data: [] as PageNode[] }));

  for (const page of pages.data ?? []) {
    if (!page.id || !page.access_token) continue;
    const pageCreds = {
      provider: "meta",
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      userAccessToken: userToken,
      ...(page.global_brand_page_id ? { globalBrandPageId: page.global_brand_page_id } : {}),
    };
    assets.push({
      pickId: `fb:${page.id}`,
      group: "facebook",
      channel: "FACEBOOK_MESSENGER",
      name: page.name,
      hint: "Messenger ve gönderi yorumları",
      externalId: page.id,
      credentials: pageCreds,
    });
    const ig = page.instagram_business_account;
    if (ig?.id) {
      assets.push({
        pickId: `ig:${ig.id}`,
        group: "instagram",
        channel: "INSTAGRAM_DM",
        name: ig.username ? `@${ig.username}` : (ig.name ?? page.name),
        hint: `${page.name} sayfasına bağlı`,
        externalId: ig.id,
        credentials: {
          ...pageCreds,
          instagramId: ig.id,
          instagramUsername: ig.username ?? "",
        },
      });
    }
  }

  const businesses = await graphGet<{ data?: BusinessNode[] }>("/me/businesses", userToken, {
    fields: "id,name",
    limit: "50",
  }).catch(() => ({ data: [] as BusinessNode[] }));

  for (const business of businesses.data ?? []) {
    const wabas = await graphGet<{ data?: WabaNode[] }>(
      `/${business.id}/owned_whatsapp_business_accounts`,
      userToken,
      { fields: "id,name", limit: "50" },
    ).catch(() => ({ data: [] as WabaNode[] }));
    for (const waba of wabas.data ?? []) {
      const phones = await graphGet<{ data?: PhoneNode[] }>(`/${waba.id}/phone_numbers`, userToken, {
        fields: "id,display_phone_number,verified_name",
        limit: "50",
      }).catch(() => ({ data: [] as PhoneNode[] }));
      for (const phone of phones.data ?? []) {
        if (!phone.id) continue;
        assets.push({
          pickId: `wa:${phone.id}`,
          group: "whatsapp",
          channel: "WHATSAPP",
          name: phone.verified_name || phone.display_phone_number || waba.name || "WhatsApp",
          hint: phone.display_phone_number || waba.name || business.name || "WhatsApp Business",
          externalId: phone.id,
          credentials: {
            provider: "meta",
            wabaId: waba.id,
            phoneNumberId: phone.id,
            displayPhoneNumber: phone.display_phone_number ?? "",
            userAccessToken: userToken,
          },
        });
      }
    }
  }

  return assets;
}

type PendingOAuthPayload = {
  pending: true;
  returnOrigin: string;
};

function asPendingPayload(raw: string): PendingOAuthPayload | null {
  try {
    const payload = JSON.parse(raw) as { pending?: boolean; returnOrigin?: string };
    if (payload.pending === true && payload.returnOrigin) {
      return { pending: true, returnOrigin: payload.returnOrigin };
    }
    return null;
  } catch {
    return null;
  }
}

function sessionExpiryMs(expiresAt: Date | string) {
  const value = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export async function createMetaOAuthPending(input: {
  state: string;
  userId: string;
  returnOrigin: string;
}) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
  const payload: PendingOAuthPayload = { pending: true, returnOrigin: input.returnOrigin };
  await prisma.$executeRaw`
    INSERT INTO support_chat_oauth_sessions
      (id, state, userId, accessToken, assetsJson, expiresAt, createdAt)
    VALUES
      (${id}, ${input.state}, ${input.userId}, ${""}, ${JSON.stringify(payload)}, ${expiresAt}, NOW(3))
  `;
  return id;
}

export async function loadMetaOAuthPending(state: string) {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; userId: string; assetsJson: string; expiresAt: Date }>
    >`
      SELECT id, userId, assetsJson, expiresAt
      FROM support_chat_oauth_sessions
      WHERE state = ${state}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || sessionExpiryMs(row.expiresAt) <= Date.now()) return null;
    const payload = asPendingPayload(row.assetsJson);
    if (!payload) return null;
    return { id: row.id, userId: row.userId, returnOrigin: payload.returnOrigin };
  } catch {
    return null;
  }
}

export async function completeMetaOAuthPending(input: {
  state: string;
  accessToken: string;
  assets: MetaPickAsset[];
}) {
  const pending = await loadMetaOAuthPending(input.state);
  if (!pending) return null;
  await prisma.$executeRaw`
    UPDATE support_chat_oauth_sessions
    SET accessToken = ${input.accessToken}, assetsJson = ${JSON.stringify(input.assets)}
    WHERE id = ${pending.id}
  `;
  return pending;
}

export async function loadMetaOAuthSession(id: string, userId: string) {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; userId: string; assetsJson: string; expiresAt: Date }>
    >`
      SELECT id, userId, assetsJson, expiresAt
      FROM support_chat_oauth_sessions
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    const expiresAt =
      row.expiresAt instanceof Date ? row.expiresAt.getTime() : new Date(row.expiresAt).getTime();
    if (row.userId !== userId || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }
    const assets = JSON.parse(row.assetsJson) as MetaPickAsset[];
    if (!Array.isArray(assets)) return null;
    return { id: row.id, assets };
  } catch {
    return null;
  }
}

export async function deleteMetaOAuthSession(id: string) {
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_oauth_sessions WHERE id = ${id}`;
  } catch {
    /* isolated */
  }
}

const PAGE_SUBSCRIPTION_FIELD_TIERS = [
  "messages,messaging_postbacks,messaging_optins,message_echoes,feed,mention",
  "messages,messaging_postbacks,messaging_optins,message_echoes,feed",
  "messages,messaging_postbacks,message_echoes,feed",
  "messages,feed",
  "messages",
] as const;

async function subscribePageWebhookFields(pageId: string, pageToken: string) {
  let lastError: Error | null = null;
  for (const subscribed_fields of PAGE_SUBSCRIPTION_FIELD_TIERS) {
    try {
      await graphPost(`/${pageId}/subscribed_apps`, pageToken, { subscribed_fields });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Webhook aboneliği başarısız.");
    }
  }
  throw lastError ?? new Error("Webhook aboneliği başarısız.");
}

function appAccessToken(appId: string, appSecret: string) {
  return `${appId}|${appSecret}`;
}

const APP_PAGE_FIELD_TIERS = [
  "messages,messaging_postbacks,messaging_optins,message_echoes,feed,mention",
  "messages,messaging_postbacks,message_echoes,feed",
  "messages,feed",
  "messages",
] as const;

const APP_INSTAGRAM_FIELD_TIERS = [
  "comments,live_comments,mentions,messages,messaging_postbacks",
  "comments,live_comments,mentions,messages",
  "comments,mentions,messages",
  "comments,messages",
  "comments",
  "messages",
] as const;

const IG_ACCOUNT_SUBSCRIPTION_FIELD_TIERS = [
  "comments,live_comments,mentions,messages,messaging_postbacks",
  "comments,live_comments,mentions,messages",
  "comments,mentions,messages",
  "comments,messages",
  "comments",
] as const;

async function subscribeInstagramWebhookFields(instagramId: string, pageToken: string) {
  let lastError: Error | null = null;
  for (const subscribed_fields of IG_ACCOUNT_SUBSCRIPTION_FIELD_TIERS) {
    try {
      await graphPost(`/${instagramId}/subscribed_apps`, pageToken, { subscribed_fields });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Instagram webhook aboneliği başarısız.");
    }
  }
  throw lastError ?? new Error("Instagram webhook aboneliği başarısız.");
}

export async function subscribeAppMetaWebhooks() {
  const config = await loadSupportChatMetaConfig();
  const appId = config.appId.trim();
  const appSecret = config.appSecret.trim();
  const callbackUrl = config.webhookUrl.trim();
  const verifyToken = config.webhookVerifyToken.trim();
  if (!appId || !appSecret || !callbackUrl || !verifyToken) return;
  const token = appAccessToken(appId, appSecret);
  const jobs: Array<{ object: string; fields: readonly string[] }> = [
    { object: "page", fields: APP_PAGE_FIELD_TIERS },
    { object: "instagram", fields: APP_INSTAGRAM_FIELD_TIERS },
  ];
  for (const job of jobs) {
    for (const fields of job.fields) {
      try {
        await graphPost(`/${appId}/subscriptions`, token, {
          object: job.object,
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields,
          include_values: "true",
        });
        break;
      } catch {
        /* try a narrower field set */
      }
    }
  }
}

export async function subscribeMetaAssets(assets: MetaPickAsset[]) {
  await subscribeAppMetaWebhooks().catch(() => undefined);
  const warnings: string[] = [];
  const seenPages = new Set<string>();
  for (const asset of assets) {
    try {
      if (asset.group === "facebook" || asset.group === "instagram") {
        const pageId = String(asset.credentials.pageId ?? "");
        const pageToken = String(asset.credentials.pageAccessToken ?? "");
        if (pageId && pageToken && !seenPages.has(pageId)) {
          seenPages.add(pageId);
          await subscribePageWebhookFields(pageId, pageToken);
        }
        const instagramId = String(asset.credentials.instagramId ?? "");
        if (instagramId && pageToken) {
          await subscribeInstagramWebhookFields(instagramId, pageToken);
        }
      }
      if (asset.group === "whatsapp") {
        const wabaId = String(asset.credentials.wabaId ?? "");
        const token = String(asset.credentials.userAccessToken ?? "");
        if (!wabaId || !token) continue;
        await graphPost(`/${wabaId}/subscribed_apps`, token);
      }
    } catch {
      warnings.push(`${supportChatChannelLabel(asset.channel)} webhook aboneliği atlandı.`);
    }
  }
  return warnings;
}

let lastPageSubscriptionEnsureAt = 0;

export async function ensureActiveMetaPageSubscriptions(force = false) {
  const now = Date.now();
  if (!force && now - lastPageSubscriptionEnsureAt < 10 * 60 * 1000) return;
  lastPageSubscriptionEnsureAt = now;
  await subscribeAppMetaWebhooks().catch(() => undefined);
  const accounts = await listActiveSupportChatAccounts();
  const seenPages = new Set<string>();
  const seenInstagram = new Set<string>();
  for (const account of accounts) {
    const pageToken = account.credentials.pageAccessToken;
    if (!pageToken) continue;
    const pageId =
      account.credentials.pageId ||
      (account.channel === "FACEBOOK_MESSENGER" || account.channel === "FACEBOOK_POST"
        ? account.externalId
        : "");
    if (pageId && !seenPages.has(pageId)) {
      seenPages.add(pageId);
      try {
        await subscribePageWebhookFields(pageId, pageToken);
      } catch {
        /* keep other pages */
      }
    }
    const instagramId =
      account.credentials.instagramId ||
      (account.channel === "INSTAGRAM_DM" || account.channel === "INSTAGRAM_POST" ? account.externalId : "");
    if (instagramId && !seenInstagram.has(instagramId)) {
      seenInstagram.add(instagramId);
      try {
        await subscribeInstagramWebhookFields(instagramId, pageToken);
      } catch {
        /* keep other accounts */
      }
    }
  }
}

export function channelsForMetaPick(asset: MetaPickAsset): SupportChatChannel[] {
  switch (asset.group) {
    case "facebook":
      return ["FACEBOOK_MESSENGER", "FACEBOOK_POST"];
    case "instagram":
      return ["INSTAGRAM_DM", "INSTAGRAM_POST"];
    case "whatsapp":
      return ["WHATSAPP"];
    default: {
      const _exhaustive: never = asset.group;
      return _exhaustive;
    }
  }
}

