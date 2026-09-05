import { NextResponse } from "next/server";
import { listWebChatMessages, sendWebChatMessage } from "@/modules/support-chat/web-chat";

export async function GET() {
  const result = await listWebChatMessages();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let payload: { name?: string; email?: string; phone?: string; body?: string };
  try {
    payload = (await request.json()) as { name?: string; email?: string; phone?: string; body?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const result = await sendWebChatMessage({
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    phone: String(payload.phone ?? ""),
    body: String(payload.body ?? ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
