import { NextResponse } from "next/server";
import { buildProductImportTemplate } from "@/lib/product-import-excel";
import { requirePermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePermission("products", "create");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const buffer = await buildProductImportTemplate();
  return new NextResponse(Uint8Array.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="urun-yukleme-kalibi.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
