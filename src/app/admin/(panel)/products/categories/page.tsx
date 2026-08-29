import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { ProductCategoriesTable } from "./categories-table";

export const metadata: Metadata = {
  title: "Ürün Kategorileri",
  description: "E-ticaret ürün kategorilerini yönetin",
};

export default async function ProductCategoriesPage() {
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { children: true } },
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
              <Tags className="h-6 w-6 text-[#405189]" />
              Ürün Kategorileri
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Ana ve alt kategorilerle ürün ağacınızı yönetin. Her satırdaki + ile
              sınırsız alt kategori ekleyebilirsiniz.
            </p>
          </div>
          <Can resource="product_categories" action="create">
            <Link
              href="/admin/products/categories/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni Kategori
            </Link>
          </Can>
        </div>
      </div>

      <ProductCategoriesTable categories={categories} />
    </div>
  );
}
