import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { originFromRequest } from "@/lib/site-origin";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import {
  loadSupportChatMetaConfig,
  metaBrowserOrigin,
  resolveMetaCallbackUrl,
} from "@/modules/support-chat/meta-config";
import {
  completeMetaOAuthPending,
  discoverMetaAssets,
  exchangeMetaOAuthCode,
  loadMetaOAuthPending,
} from "@/modules/support-chat/meta-oauth";

function toKanallar(origin: string, code: string) {
  return NextResponse.redirect(`${origin}/admin/settings/support/kanallar?meta=${code}`);
}

export async function GET(request: Request) {
  const requestOrigin = originFromRequest(request);
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const [pending, config] = await Promise.all([
    state ? loadMetaOAuthPending(state).catch(() => null) : Promise.resolve(null),
    loadSupportChatMetaConfig(),
  ]);
  const redirectUri = resolveMetaCallbackUrl(config, requestOrigin);
  const adminOrigin = metaBrowserOrigin(redirectUri, pending?.returnOrigin || requestOrigin);

  try {
    if (url.searchParams.get("error")) return toKanallar(adminOrigin, "iptal");

    const code = url.searchParams.get("code") ?? "";
    const cookieStore = await cookies();
    cookieStore.delete("sc_meta_oauth");
    if (!code || !state || !pending) return toKanallar(adminOrigin, "guvenlik");

    const licensed = await isSupportChatLicensed().catch(() => false);
    if (!licensed) return toKanallar(adminOrigin, "lisans");

    const token = await exchangeMetaOAuthCode(code, redirectUri);
    const assets = await discoverMetaAssets(token.accessToken);
    if (assets.length === 0) return toKanallar(adminOrigin, "bos");

    const session = await completeMetaOAuthPending({
      state,
      accessToken: token.accessToken,
      assets,
    });
    if (!session) return toKanallar(adminOrigin, "guvenlik");

    return NextResponse.redirect(
      `${adminOrigin}/admin/settings/support/kanallar/meta?session=${session.id}`,
    );
  } catch {
    return toKanallar(adminOrigin, "hata");
  }
}
