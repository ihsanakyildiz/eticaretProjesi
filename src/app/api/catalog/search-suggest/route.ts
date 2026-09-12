import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/search-suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") ?? "");
  const data = await getSearchSuggestions(q);
  return NextResponse.json(data);
}
