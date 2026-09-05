import "server-only";

import { prisma } from "@/lib/prisma";
import { preferHttpForLoopback } from "@/lib/site-origin";

export const META_CALLBACK_PATH = "/api/support-chat/meta/callback";
export const META_WEBHOOK_PATH = "/api/support-chat/webhook/meta";

export type SupportChatMetaConfig = {
  appId: string;
  appSecret: string;
  configId: string;
  webhookVerifyToken: string;
  callbackUrl: string;
  webhookUrl: string;
};

const KEYS = {
  appId: "meta_app_id",
  appSecret: "meta_app_secret",
  configId: "meta_config_id",
  webhookVerifyToken: "meta_webhook_verify_token",
  callbackUrl: "meta_callback_url",
  webhookUrl: "meta_webhook_url",
} as const;

export function defaultMetaCallbackUrl(origin: string) {
  return `${origin}${META_CALLBACK_PATH}`;
}

export function defaultMetaWebhookUrl(origin: string) {
  return `${origin}${META_WEBHOOK_PATH}`;
}

function normalizePublicUrl(raw: string, expectedPath: string, label: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { error: `${label} gerekli.` };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: `${label} http veya https olmalı.` };
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path !== expectedPath) {
      return { error: `${label} şu yol ile bitmeli: ${expectedPath}` };
    }
    return { ok: `${url.origin}${expectedPath}` };
  } catch {
    return { error: `${label} geçerli bir URL olmalı.` };
  }
}

async function readSetting(key: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ settingValue: string }>>`
      SELECT settingValue FROM support_chat_settings WHERE settingKey = ${key} LIMIT 1
    `;
    return rows[0]?.settingValue ?? "";
  } catch {
    return "";
  }
}

async function writeSetting(key: string, value: string) {
  await prisma.$executeRaw`
    INSERT INTO support_chat_settings (settingKey, settingValue, updatedAt)
    VALUES (${key}, ${value}, NOW(3))
    ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue), updatedAt = NOW(3)
  `;
}

export async function loadSupportChatMetaConfig(): Promise<SupportChatMetaConfig> {
  const [appId, appSecret, configId, webhookVerifyToken, callbackUrl, webhookUrl] = await Promise.all([
    readSetting(KEYS.appId),
    readSetting(KEYS.appSecret),
    readSetting(KEYS.configId),
    readSetting(KEYS.webhookVerifyToken),
    readSetting(KEYS.callbackUrl),
    readSetting(KEYS.webhookUrl),
  ]);
  return { appId, appSecret, configId, webhookVerifyToken, callbackUrl, webhookUrl };
}

export function resolveMetaCallbackUrl(config: SupportChatMetaConfig, origin: string) {
  return config.callbackUrl.trim() || defaultMetaCallbackUrl(origin);
}

export function resolveMetaWebhookUrl(config: SupportChatMetaConfig, origin: string) {
  return config.webhookUrl.trim() || defaultMetaWebhookUrl(origin);
}

export function metaBrowserOrigin(callbackUrl: string, fallbackOrigin: string) {
  try {
    const url = new URL(callbackUrl);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return url.origin;
    }
  } catch {
    /* ignore invalid callback */
  }
  return preferHttpForLoopback(fallbackOrigin);
}

export function isSupportChatMetaConfigured(config: SupportChatMetaConfig) {
  return Boolean(config.appId.trim() && config.appSecret.trim());
}

export async function saveSupportChatMetaConfig(input: {
  appId: string;
  appSecret: string;
  configId: string;
  callbackUrl: string;
  webhookUrl: string;
  preserveSecret: boolean;
}) {
  const appId = input.appId.trim();
  const configId = input.configId.trim();
  if (appId.length < 5) return { error: "Meta Uygulama ID gerekli." };
  const callback = normalizePublicUrl(input.callbackUrl, META_CALLBACK_PATH, "OAuth yönlendirme adresi");
  if ("error" in callback) return callback;
  const webhook = normalizePublicUrl(input.webhookUrl, META_WEBHOOK_PATH, "Webhook adresi");
  if ("error" in webhook) return webhook;
  try {
    await writeSetting(KEYS.appId, appId);
    await writeSetting(KEYS.configId, configId);
    await writeSetting(KEYS.callbackUrl, callback.ok);
    await writeSetting(KEYS.webhookUrl, webhook.ok);
    if (!input.preserveSecret) {
      const secret = input.appSecret.trim();
      if (secret.length < 8) return { error: "Meta Uygulama Gizli Anahtarı gerekli." };
      await writeSetting(KEYS.appSecret, secret);
    } else {
      const current = await readSetting(KEYS.appSecret);
      if (!current) return { error: "Meta Uygulama Gizli Anahtarı gerekli." };
    }
    const verify = (await readSetting(KEYS.webhookVerifyToken)) || crypto.randomUUID().replace(/-/g, "");
    await writeSetting(KEYS.webhookVerifyToken, verify);
    return { ok: true as const };
  } catch {
    return { error: "Meta ayarları kaydedilemedi." };
  }
}
