import { NextResponse } from "next/server";
import { buildProductUpdateWorkbook } from "@/lib/product-import-update-excel";
import { isProductUpdateMode } from "@/lib/product-import-update-shared";
import { requirePermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const gate = await requirePermission("products", "update");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const url = new URL(request.url);
  const modeRaw = url.searchParams.get("mode") ?? "all";
  if (!isProductUpdateMode(modeRaw)) {
    return NextResponse.json({ error: "Geçersiz güncelleme türü." }, { status: 400 });
  }

  try {
    const buffer = await buildProductUpdateWorkbook(
      {
        categoryId: url.searchParams.get("categoryId")?.trim() || null,
        brandId: url.searchParams.get("brandId")?.trim() || null,
      },
      modeRaw,
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="urun-guncelleme-${modeRaw}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes("Can't reach database")
        ? "Veritabanına ulaşılamadı. MySQL’in (XAMPP) çalıştığından emin olun ve tekrar deneyin."
        : "Excel hazırlanırken bir hata oluştu. Filtreyi daraltıp tekrar deneyin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
