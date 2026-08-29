import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildCategoryTree, toNamedTree } from "@/lib/category-tree";
import { ProductFilterForm } from "../filter-form";

export const metadata: Metadata = {
  title: "Yeni filtre",
};

export default async function NewProductFilterPage() {
  const [categories, variantAttributes, brands] = await Promise.all([
    prisma.productCategory.findMany({
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    prisma.productAttribute.findMany({
      where: { filter: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, displayType: true },
    }),
    prisma.brand.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, logo: true, isActive: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni filtre</h1>
        <p className="mt-2 text-sm text-slate-500">
          Marka, fiyat ve stok için Sistem seçin. Beden/renk için Varyant. Malzeme gibi özellikler
          için Özel özellik.
        </p>
      </div>

      <ProductFilterForm
        mode="create"
        categoryTree={toNamedTree(buildCategoryTree(categories))}
        variantAttributes={variantAttributes}
        brands={brands}
      />
    </div>
  );
}
