import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCategoryTree, toNamedTree } from "@/lib/category-tree";
import { filterUsesCustomValues } from "@/lib/product-filters";
import { ProductFilterForm } from "../../filter-form";
import { ProductFilterValuesPanel } from "../../values-panel";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const filter = await prisma.productFilter.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: filter ? `Düzenle: ${filter.name}` : "Filtre düzenle" };
}

export default async function EditProductFilterPage({ params }: EditPageProps) {
  const { id } = await params;
  const [filter, categories] = await Promise.all([
    prisma.productFilter.findUnique({
      where: { id },
      include: {
        values: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        categories: { select: { categoryId: true } },
        variantAttribute: { select: { id: true, name: true, slug: true, displayType: true } },
      },
    }),
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
  ]);
  if (!filter) notFound();

  const variantAttributes = await prisma.productAttribute.findMany({
    where: {
      OR: [
        { AND: [{ isActive: true }, { filter: null }] },
        ...(filter.variantAttributeId ? [{ id: filter.variantAttributeId }] : []),
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, displayType: true },
  });
  const brands = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, logo: true, isActive: true },
  });

  const showValues = filterUsesCustomValues(filter.inputType, filter.kind);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Filtreyi düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {filter.name} · {filter.slug}
          {filter.variantAttribute ? ` · varyant: ${filter.variantAttribute.name}` : null}
        </p>
      </div>

      {showValues ? (
        <ProductFilterValuesPanel
          filterId={filter.id}
          filterName={filter.name}
          inputType={filter.inputType}
          values={filter.values.map((value) => ({
            id: value.id,
            name: value.name,
            slug: value.slug,
            colorHex: value.colorHex,
            image: value.image,
            isActive: value.isActive,
            sortOrder: value.sortOrder,
          }))}
        />
      ) : filter.kind === "VARIANT" ? (
        <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
          Değerler varyant özelliğinden gelir; burada tekrar edilmez.
        </div>
      ) : filter.kind === "SYSTEM" && filter.systemKey === "BRAND" ? null : (
        <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
          {filter.kind === "SYSTEM"
            ? "Değerler fiyat veya stok kayıtlarından gelir; buraya yazılmaz."
            : "Bu vitrin tipi için liste değeri yok (evet/hayır veya aralık)."}
        </div>
      )}

      <ProductFilterForm
        mode="edit"
        categoryTree={toNamedTree(buildCategoryTree(categories))}
        variantAttributes={variantAttributes}
        brands={brands}
        initial={{
          id: filter.id,
          name: filter.name,
          slug: filter.slug,
          description: filter.description ?? "",
          kind: filter.kind,
          systemKey: filter.systemKey,
          variantAttributeId: filter.variantAttributeId,
          inputType: filter.inputType,
          unit: filter.unit,
          hideEmptyValues: filter.hideEmptyValues,
          showProductCount: filter.showProductCount,
          appliesGlobally: filter.appliesGlobally,
          inheritToChildren: filter.inheritToChildren,
          sortOrder: filter.sortOrder,
          isActive: filter.isActive,
          categoryIds: filter.categories.map((link) => link.categoryId),
        }}
      />
    </div>
  );
}
