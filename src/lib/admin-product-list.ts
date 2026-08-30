import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  image: string | null;
  isActive: boolean;
  basePriceMinor: number;
  categoryName: string | null;
  brandName: string | null;
  stockQuantity: number;
  variantCount: number;
};

export const ADMIN_PRODUCTS_PAGE_SIZE = 40;

export type AdminProductListQuery = {
  q: string;
  page: number;
};

export type AdminProductListResult = {
  products: ProductRow[];
  q: string;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

function sanitizeSearch(raw: string) {
  return raw.trim().replace(/[%_]/g, "").slice(0, 120);
}

export function parseAdminProductListQuery(searchParams: {
  page?: string;
  q?: string;
}): AdminProductListQuery {
  const q = sanitizeSearch(searchParams.q ?? "");
  const parsed = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { q, page };
}

function productListWhere(q: string): Prisma.ProductWhereInput {
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q } },
      { slug: { contains: q } },
      { sku: { contains: q } },
      { category: { name: { contains: q } } },
      { brand: { name: { contains: q } } },
      {
        variants: {
          some: {
            OR: [{ sku: { contains: q } }, { barcode: { contains: q } }],
          },
        },
      },
    ],
  };
}

export async function loadAdminProductPage(
  query: AdminProductListQuery,
): Promise<AdminProductListResult> {
  const pageSize = ADMIN_PRODUCTS_PAGE_SIZE;
  const where = productListWhere(query.q);
  const requestedPage = Math.max(1, query.page);
  const productSelect = {
    id: true,
    title: true,
    slug: true,
    sku: true,
    image: true,
    isActive: true,
    basePriceMinor: true,
    category: { select: { name: true } },
    brand: { select: { name: true } },
  } as const;

  const [total, initialProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      skip: (requestedPage - 1) * pageSize,
      take: pageSize,
      select: productSelect,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const products =
    initialProducts.length > 0 || total === 0 || page === requestedPage
      ? initialProducts
      : await prisma.product.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: productSelect,
        });

  const productIds = products.map((product) => product.id);
  const variantStats =
    productIds.length === 0
      ? []
      : await prisma.productVariant.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
          _count: { _all: true },
          _sum: { stockQuantity: true },
        });
  const statsByProduct = new Map(
    variantStats.map((row) => [
      row.productId,
      { stock: row._sum.stockQuantity ?? 0, variants: row._count._all },
    ]),
  );

  return {
    q: query.q,
    total,
    page,
    pageCount,
    pageSize,
    products: products.map((product) => {
      const stats = statsByProduct.get(product.id);
      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        image: product.image,
        isActive: product.isActive,
        basePriceMinor: product.basePriceMinor,
        categoryName: product.category?.name ?? null,
        brandName: product.brand?.name ?? null,
        stockQuantity: stats?.stock ?? 0,
        variantCount: stats?.variants ?? 0,
      };
    }),
  };
}
