import { NextResponse } from "next/server";
import { getWebChatSession } from "@/modules/support-chat/web-chat";

export async function GET(request: Request) {
  const seenAt = new URL(request.url).searchParams.get("seenAt");
  const result = await getWebChatSession(seenAt);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
