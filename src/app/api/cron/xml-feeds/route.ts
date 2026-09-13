import { NextResponse } from "next/server";
import { purgeExpiredPersonalizationUploads } from "@/lib/personalization-uploads";
import { expireEndedProductSales } from "@/lib/product-sale-expire";
import { resumeBackgroundWorkers } from "@/lib/resume-background-workers";
import { requirePermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isLoopback(request: Request) {
  const host = (request.headers.get("host") ?? "").split(":")[0]?.toLowerCase();
  const urlHost = new URL(request.url).hostname.toLowerCase();
  return [host, urlHost].some((value) => value === "127.0.0.1" || value === "localhost" || value === "::1");
}

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    return token === secret;
  }
  if (isLoopback(request)) return true;
  const gate = await requirePermission("products", "view");
  return gate.ok;
}

export async function GET(request: Request) {
  const allowed = await authorize(request);
  if (!allowed) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  await expireEndedProductSales();
  await resumeBackgroundWorkers();
  const personalizationPurge = await purgeExpiredPersonalizationUploads().catch((error) => {
    console.error(error);
    return { deleted: 0, orphanDeleted: 0, claimedLate: 0, error: true as const };
  });
  return NextResponse.json({ ok: true, personalizationPurge });
}

export async function POST(request: Request) {
  return GET(request);
}
