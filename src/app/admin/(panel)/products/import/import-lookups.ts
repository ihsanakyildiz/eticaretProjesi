import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import type { XmlFeedFilterCatalogItem, XmlFeedLookupOption } from "@/lib/xml-product-feed-shared";

export async function loadAdminImportLookups() {
  const [categoryRows, brands, suppliers, filterRows] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.productFilter.findMany({
      where: { kind: "CUSTOM", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        inputType: true,
        unit: true,
        values: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  const categories: XmlFeedLookupOption[] = flattenCategoryTree(buildCategoryTree(categoryRows)).map(
    (category) => ({
      id: category.id,
      name: category.name,
      depth: category.depth,
    }),
  );

  const filters: XmlFeedFilterCatalogItem[] = filterRows.map((filter) => ({
    id: filter.id,
    name: filter.name,
    slug: filter.slug,
    inputType: filter.inputType,
    unit: filter.unit,
    values: filter.values,
  }));

  return { categories, brands, suppliers, filters };
}
