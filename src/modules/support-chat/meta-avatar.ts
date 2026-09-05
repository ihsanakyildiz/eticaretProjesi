import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { digitsOnly, phoneLookupNeedles } from "@/lib/phone-number";
import { downloadRemoteMediaUrl } from "@/modules/support-chat/media";
import { graphGetMaybe } from "@/modules/support-chat/meta-oauth";
import type { SupportChatChannel } from "@/modules/support-chat/kinds";

export function supportChatChannelHasSocialAvatar(channel: SupportChatChannel) {
  switch (channel) {
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
    case "WHATSAPP":
      return true;
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

const INSTAGRAM_USERNAME_BLOCKLIST = new Set(["yorum", "musteri", "facebookkullanicisi"]);

export function supportChatInstagramAccountContext(
  creds: Record<string, string>,
  accounts: Array<{ credentials: Record<string, string> }> = [],
) {
  const ownUsername = creds.instagramUsername || "";
  if (creds.instagramId) return { instagramId: creds.instagramId, ownUsername };
  const pageId = creds.pageId || "";
  const sibling =
    accounts.find((account) => account.credentials.instagramId && pageId && account.credentials.pageId === pageId) ??
    accounts.find((account) => Boolean(account.credentials.instagramId));
  return {
    instagramId: sibling?.credentials.instagramId || "",
    ownUsername: sibling?.credentials.instagramUsername || ownUsername,
  };
}

export function supportChatInstagramUsername(...values: Array<string | null | undefined>) {
  for (const raw of values) {
    const value = (raw ?? "").trim().replace(/^@/, "");
    const folded = value
      .toLocaleLowerCase("tr-TR")
      .replace(/[ıİ]/g, "i")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/\s+/g, "");
    if (INSTAGRAM_USERNAME_BLOCKLIST.has(folded)) continue;
    if (/^[A-Za-z0-9._]{1,30}$/.test(value) && !/^\d+$/.test(value)) return value;
  }
  return "";
}

export function supportChatAvatarPersonId(input: {
  channel: SupportChatChannel;
  externalThreadId: string;
  customerHandle: string | null;
  customerName?: string | null;
}) {
  switch (input.channel) {
    case "FACEBOOK_MESSENGER":
    case "INSTAGRAM_DM":
      return input.externalThreadId.trim();
    case "FACEBOOK_POST": {
      const handle = (input.customerHandle ?? "").replace(/^@/, "").trim();
      return /^\d+$/.test(handle) ? handle : "";
    }
    case "INSTAGRAM_POST": {
      const handle = (input.customerHandle ?? "").replace(/^@/, "").trim();
      if (/^\d+$/.test(handle)) return handle;
      return supportChatInstagramUsername(input.customerHandle, input.customerName);
    }
    case "WHATSAPP":
      return digitsOnly(input.customerHandle || input.externalThreadId);
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return "";
    default: {
      const _exhaustive: never = input.channel;
      return _exhaustive;
    }
  }
}

function firstHttpsUrl(value: unknown): string {
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : "";
}

export async function resolveSocialCustomerAvatar(input: {
  token: string;
  personId: string;
}): Promise<string | null> {
  const personId = input.personId.trim();
  if (!personId || !input.token) return null;
  const profile = await graphGetMaybe<{
    profile_pic?: string;
    profile_picture_url?: string;
    picture?: { data?: { url?: string; is_silhouette?: boolean } };
  }>(`/${personId}`, input.token, { fields: "profile_pic,profile_picture_url,picture" });
  let remote =
    firstHttpsUrl(profile?.profile_pic) ||
    firstHttpsUrl(profile?.profile_picture_url) ||
    (profile?.picture?.data?.is_silhouette ? "" : firstHttpsUrl(profile?.picture?.data?.url));
  if (!remote) {
    const picture = await graphGetMaybe<{ data?: { url?: string; is_silhouette?: boolean } }>(
      `/${personId}/picture`,
      input.token,
      { redirect: "false", type: "normal", width: "160" },
    );
    if (!picture?.data?.is_silhouette) remote = firstHttpsUrl(picture?.data?.url);
  }
  if (!remote) return null;
  return persistAvatarSrc(remote, input.token);
}

async function ownInstagramProfilePicture(token: string, instagramId: string): Promise<string | null> {
  const profile = await graphGetMaybe<{ profile_picture_url?: string }>(
    `/${instagramId}`,
    token,
    { fields: "username,profile_picture_url" },
  );
  const remote = firstHttpsUrl(profile?.profile_picture_url);
  return remote ? persistAvatarSrc(remote, token) : null;
}

async function resolveInstagramCustomerAvatar(input: {
  token: string;
  personId: string;
  username: string;
  instagramId: string;
  ownUsername: string;
}): Promise<string | null> {
  if (!input.token) return null;
  const username = supportChatInstagramUsername(input.username, input.personId);
  const igId = input.instagramId.trim();
  const ownUsername = supportChatInstagramUsername(input.ownUsername);
  const sameAccount =
    Boolean(igId) &&
    (input.personId === igId ||
      Boolean(username && ownUsername && username.toLowerCase() === ownUsername.toLowerCase()));
  if (sameAccount) {
    const own = await ownInstagramProfilePicture(input.token, igId);
    if (own) return own;
  }
  if (/^\d+$/.test(input.personId)) {
    const messaging = await graphGetMaybe<{ profile_pic?: string }>(
      `/${input.personId}`,
      input.token,
      { fields: "name,username,profile_pic" },
    );
    const fromMessaging = firstHttpsUrl(messaging?.profile_pic);
    if (fromMessaging) return persistAvatarSrc(fromMessaging, input.token);
    const igUser = await graphGetMaybe<{ profile_picture_url?: string }>(
      `/${input.personId}`,
      input.token,
      { fields: "username,profile_picture_url" },
    );
    const fromUser = firstHttpsUrl(igUser?.profile_picture_url);
    if (fromUser) return persistAvatarSrc(fromUser, input.token);
  }
  if (username && igId) {
    const discovery = await graphGetMaybe<{
      business_discovery?: { profile_picture_url?: string };
    }>(`/${igId}`, input.token, {
      fields: `business_discovery.username(${username}){profile_picture_url}`,
    });
    const remote = firstHttpsUrl(discovery?.business_discovery?.profile_picture_url);
    if (remote) return persistAvatarSrc(remote, input.token);
  }
  return null;
}

async function persistAvatarSrc(src: string, token?: string): Promise<string | null> {
  const value = src.trim();
  if (!value) return null;
  if (value.startsWith("/")) return value.slice(0, 500);
  if (!/^https?:\/\//.test(value)) return null;
  const saved = await downloadRemoteMediaUrl({
    url: value,
    tokens: token ? [token] : [],
    kind: "image",
    fileName: "customer-avatar.jpg",
  });
  return saved?.src ?? null;
}

async function findStoreCustomerAvatarByPhone(phone: string): Promise<string | null> {
  const needles = phoneLookupNeedles(phone);
  if (needles.length === 0) return null;
  const userMatch = Prisma.join(
    needles.map((needle) => Prisma.sql`u.phone LIKE ${`%${needle}`}`),
    " OR ",
  );
  const addressMatch = Prisma.join(
    needles.map((needle) => Prisma.sql`a.phone LIKE ${`%${needle}`}`),
    " OR ",
  );
  try {
    const rows = await prisma.$queryRaw<
      Array<{ image: string | null; phone: string | null; addressPhone: string | null }>
    >`
      SELECT u.image, u.phone, a.phone AS addressPhone
      FROM users u
      LEFT JOIN customer_addresses a ON a.userId = u.id
      WHERE u.image IS NOT NULL AND u.image != ''
        AND ((${userMatch}) OR (${addressMatch}))
      LIMIT 8
    `;
    const wanted = new Set(needles);
    for (const row of rows) {
      const image = row.image?.trim() ?? "";
      if (!image) continue;
      const phones = [row.phone, row.addressPhone];
      const matched = phones.some((value) => phoneLookupNeedles(value ?? "").some((key) => wanted.has(key)));
      if (matched) return image;
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveCustomerAvatar(input: {
  channel: SupportChatChannel;
  token: string;
  personId: string;
  username?: string | null;
  instagramId?: string | null;
  ownUsername?: string | null;
  remoteUrl?: string | null;
}): Promise<string | null> {
  if (input.remoteUrl) {
    const fromUrl = await persistAvatarSrc(input.remoteUrl, input.token);
    if (fromUrl) return fromUrl;
  }
  switch (input.channel) {
    case "WHATSAPP": {
      const store = await findStoreCustomerAvatarByPhone(input.personId);
      return store ? persistAvatarSrc(store, input.token) : null;
    }
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return resolveInstagramCustomerAvatar({
        token: input.token,
        personId: input.personId,
        username: input.username ?? "",
        instagramId: input.instagramId ?? "",
        ownUsername: input.ownUsername ?? "",
      });
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
      return input.token ? resolveSocialCustomerAvatar({ token: input.token, personId: input.personId }) : null;
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return null;
    default: {
      const _exhaustive: never = input.channel;
      return _exhaustive;
    }
  }
}
