import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { DuplicateBarcodeAlert } from "@/components/admin/duplicate-barcode-alert";
import { loadAdminProductPage, parseAdminProductListQuery } from "@/lib/admin-product-list";
import { countDuplicateBarcodes } from "@/lib/product-barcode-db";
import { isAdvancedInventoryEnabledInMap } from "@/lib/advanced-inventory";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";
import { ProductsTable } from "./products-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ürün kataloğu",
  description: "Mağaza ürünlerini yönetin",
};

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [list, settings, duplicateBarcodeCount] = await Promise.all([
    loadAdminProductPage(parseAdminProductListQuery(params)),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    countDuplicateBarcodes().catch(() => 0),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <LayoutGrid className="h-6 w-6 text-[#405189]" />
              Ürün kataloğu
              <span className="text-base font-medium text-slate-400">
                ({list.total.toLocaleString("tr-TR")})
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Görsel, fiyat, stok ve kombinasyonları tek kayıttan yönetin. En son eklenen
              ürünler üsttedir; filtreler sunucuda çalışır.
            </p>
          </div>
          <Can resource="products" action="create">
            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni Ürün
            </Link>
          </Can>
        </div>
      </div>

      <DuplicateBarcodeAlert count={duplicateBarcodeCount} />

      <ProductsTable
        products={list.products}
        query={list.query}
        lookups={list.lookups}
        page={list.page}
        pageCount={list.pageCount}
        total={list.total}
        pageSize={list.pageSize}
        urlStructure={parseUrlStructure(settings)}
        advancedInventory={isAdvancedInventoryEnabledInMap(settings)}
      />
    </div>
  );
}
