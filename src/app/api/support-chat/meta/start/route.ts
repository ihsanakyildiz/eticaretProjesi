import { NextResponse } from "next/server";
import { originFromRequest } from "@/lib/site-origin";
import { requirePermission } from "@/lib/staff-permissions";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import {
  isSupportChatMetaConfigured,
  loadSupportChatMetaConfig,
  metaBrowserOrigin,
  resolveMetaCallbackUrl,
} from "@/modules/support-chat/meta-config";
import { buildMetaOAuthUrl, createMetaOAuthPending } from "@/modules/support-chat/meta-oauth";

export async function GET(request: Request) {
  const origin = originFromRequest(request);
  const back = (code: string) =>
    NextResponse.redirect(`${origin}/admin/settings/support/kanallar?meta=${code}`);

  try {
    const licensed = await isSupportChatLicensed().catch(() => false);
    if (!licensed) return back("lisans");

    const gate = await requirePermission("settings_support", "update");
    const userId = gate.ok ? gate.session.user?.id : null;
    if (!gate.ok || !userId) return back("yetki");

    const config = await loadSupportChatMetaConfig();
    if (!isSupportChatMetaConfigured(config)) return back("ayar");

    const redirectUri = resolveMetaCallbackUrl(config, origin);
    const returnOrigin = metaBrowserOrigin(redirectUri, origin);
    const state = crypto.randomUUID();
    await createMetaOAuthPending({
      state,
      userId,
      returnOrigin,
    });

    const response = NextResponse.redirect(
      buildMetaOAuthUrl({
        appId: config.appId,
        redirectUri,
        state,
        configId: config.configId || undefined,
      }),
    );
    response.cookies.set("sc_meta_oauth", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
      secure: redirectUri.startsWith("https://"),
    });
    return response;
  } catch {
    return back("hata");
  }
}
