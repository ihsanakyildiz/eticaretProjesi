import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "./products-table";

export const metadata: Metadata = {
  title: "Ürün kataloğu",
  description: "Mağaza ürünlerini yönetin",
};

export default async function ProductsCatalogPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      image: true,
      isActive: true,
      basePriceMinor: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      variants: { select: { stockQuantity: true } },
    },
  });

  const rows = products.map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    sku: product.sku,
    image: product.image,
    isActive: product.isActive,
    basePriceMinor: product.basePriceMinor,
    categoryName: product.category?.name ?? null,
    brandName: product.brand?.name ?? null,
    stockQuantity: product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0),
    variantCount: product.variants.length,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <LayoutGrid className="h-6 w-6 text-[#405189]" />
              Ürün kataloğu
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Görsel, fiyat, stok ve kombinasyonları tek kayıttan yönetin. Yeni ürün sekme
              düzeninde, kaydetmeden sekmeler arasında gezerek doldurulur.
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

      <ProductsTable products={rows} />
    </div>
  );
}
