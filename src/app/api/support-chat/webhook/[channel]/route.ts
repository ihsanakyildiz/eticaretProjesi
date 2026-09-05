import { after, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const licensed = await import("@/modules/support-chat/license")
      .then((mod) => mod.isSupportChatLicensed())
      .catch(() => false);
    if (!licensed) {
      return NextResponse.json({ ok: false, error: "module_unlicensed" }, { status: 404 });
    }

    const raw = await request.text();
    const config = await import("@/modules/support-chat/meta-config")
      .then((mod) => mod.loadSupportChatMetaConfig())
      .catch(() => null);
    const signature = request.headers.get("x-hub-signature-256");
    const {
      verifyMetaWebhookSignature,
      ingestMetaWebhookPayload,
      enrichWebhookPostSources,
      enrichWebhookCustomerAvatars,
    } = await import("@/modules/support-chat/meta-webhook");
    if (config && !verifyMetaWebhookSignature(raw, signature, config.appSecret)) {
      return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 401 });
    }
    if (!raw.trim()) {
      return NextResponse.json({ ok: true, ingested: 0 });
    }
    const payload = JSON.parse(raw) as unknown;
    const objectType =
      payload && typeof payload === "object" && "object" in payload
        ? String((payload as { object?: unknown }).object ?? "")
        : "";
    if (objectType) {
      console.info("support-chat webhook", objectType);
    }
    const result = await ingestMetaWebhookPayload(payload);
    if (result.enrichJobs.length > 0 || result.avatarJobs.length > 0 || result.autoReplyJobs.length > 0) {
      after(() => {
        void enrichWebhookPostSources(result.enrichJobs);
        void enrichWebhookCustomerAvatars(result.avatarJobs);
        void import("@/modules/support-chat/auto-replies-send").then((mod) =>
          Promise.all(result.autoReplyJobs.map((id) => mod.maybeSendSupportChatAutoReply(id))),
        );
      });
    }
    return NextResponse.json({ ok: true, ingested: result.ingested });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && challenge) {
      const config = await import("@/modules/support-chat/meta-config")
        .then((mod) => mod.loadSupportChatMetaConfig())
        .catch(() => null);
      if (config?.webhookVerifyToken && config.webhookVerifyToken === token) {
        return new NextResponse(challenge, { status: 200 });
      }
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  } catch {
    /* isolated */
  }
  return NextResponse.json({ ok: true });
}
