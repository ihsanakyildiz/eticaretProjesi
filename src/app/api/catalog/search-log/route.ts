import { NextResponse } from "next/server";
import { recordSearchTerm } from "@/lib/search-suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const raw =
    body && typeof body === "object" && "q" in body
      ? String((body as { q: unknown }).q ?? "")
      : "";
  await recordSearchTerm(raw);
  return NextResponse.json({ ok: true });
}
