import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import type { XmlFeedLookupOption } from "@/lib/xml-product-feed-shared";

export async function loadAdminImportLookups() {
  const [categoryRows, brands, suppliers] = await Promise.all([
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
  ]);

  const categories: XmlFeedLookupOption[] = flattenCategoryTree(buildCategoryTree(categoryRows)).map(
    (category) => ({
      id: category.id,
      name: category.name,
      depth: category.depth,
    }),
  );

  return { categories, brands, suppliers };
}
