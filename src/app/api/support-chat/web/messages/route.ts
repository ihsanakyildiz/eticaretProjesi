import { NextResponse } from "next/server";
import { listWebChatMessages, sendWebChatMessage } from "@/modules/support-chat/web-chat";

export async function GET() {
  const result = await listWebChatMessages();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

async function readSendPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    return {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      body: String(form.get("body") ?? ""),
      file: file instanceof File && file.size > 0 ? file : null,
    };
  }
  const payload = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    body?: string;
  };
  return {
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    phone: String(payload.phone ?? ""),
    body: String(payload.body ?? ""),
    file: null as File | null,
  };
}

export async function POST(request: Request) {
  let payload: { name: string; email: string; phone: string; body: string; file: File | null };
  try {
    payload = await readSendPayload(request);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const result = await sendWebChatMessage(payload);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
