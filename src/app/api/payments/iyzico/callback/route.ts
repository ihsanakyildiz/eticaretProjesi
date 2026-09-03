import { NextResponse } from "next/server";
import { finalizeIyzicoCheckout } from "@/lib/iyzico-complete";
import { getSettingsMapUncached } from "@/lib/settings";
import { originFromRequest } from "@/lib/site-origin";

export const runtime = "nodejs";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function breakoutRedirect(url: string) {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(url)}">
  <title>Yönlendiriliyor</title>
</head>
<body>
  <script>
    (function () {
      var url = ${JSON.stringify(url)};
      try {
        if (window.top && window.top !== window) {
          window.top.location.replace(url);
          return;
        }
      } catch (e) {}
      window.location.replace(url);
    })();
  </script>
  <p><a href="${escapeHtmlAttr(url)}">Sipariş sayfasına git</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readCallbackFields(request: Request): Promise<{
  token: string | null;
  conversationId: string | null;
}> {
  const url = new URL(request.url);
  let token = url.searchParams.get("token")?.trim() || url.searchParams.get("Token")?.trim() || null;
  let conversationId =
    url.searchParams.get("conversationId")?.trim() ||
    url.searchParams.get("conversationid")?.trim() ||
    null;

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      token = token || String(json.token ?? json.Token ?? "").trim() || null;
      conversationId =
        conversationId || String(json.conversationId ?? json.conversationid ?? "").trim() || null;
    } else {
      const form = await request.formData();
      token = token || String(form.get("token") ?? form.get("Token") ?? "").trim() || null;
      conversationId =
        conversationId ||
        String(form.get("conversationId") ?? form.get("conversationid") ?? "").trim() ||
        null;
    }
  } catch {
    /* empty body or unsupported content-type */
  }

  return { token, conversationId };
}

async function handleCallback(request: Request) {
  const settings = await getSettingsMapUncached();
  const origin = originFromRequest(request, settings);
  const failUrl = `${origin}/odeme?adim=odeme&iptal=1`;
  const { token, conversationId } = await readCallbackFields(request);

  if (!token && !conversationId) {
    return breakoutRedirect(failUrl);
  }

  const finalized = await finalizeIyzicoCheckout({
    settings,
    token,
    conversationId,
  });

  if (!finalized.ok) {
    return breakoutRedirect(failUrl);
  }

  return breakoutRedirect(`${origin}/siparis/tesekkur/${finalized.reference}?odeme=ok`);
}

export async function POST(request: Request) {
  return handleCallback(request);
}

export async function GET(request: Request) {
  return handleCallback(request);
}
