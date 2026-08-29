import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { ProductFiltersTable } from "./filters-table";

export const metadata: Metadata = {
  title: "Ürün filtreleri",
  description: "Vitrin fasetlerini yönetin",
};

export default async function ProductFiltersPage() {
  const filters = await prisma.productFilter.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      inputType: true,
      appliesGlobally: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { values: true, categories: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Mağaza
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <SlidersHorizontal className="h-6 w-6 text-[#405189]" />
              Ürün filtreleri
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Amazon / Magento kuralı: gruplar arası VE, aynı grupta VEYA. Beden ve renk varyant
              SKU’sundan gelir; malzeme gibi özellikler ürüne yazılır. Filtreler kategori
              ağacına bağlanır ve alt kategorilere miras edilir.
            </p>
          </div>
          <Can resource="filters" action="create">
            <Link
              href="/admin/products/filters/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni Filtre
            </Link>
          </Can>
        </div>
      </div>

      <ProductFiltersTable filters={filters} />
    </div>
  );
}
