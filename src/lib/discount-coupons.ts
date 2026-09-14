import "server-only";

import { Prisma } from "@prisma/client";
import { loadCampaignFormLookups } from "@/lib/campaigns";
import { joinFullName, splitFullName } from "@/lib/customers";
import {
  discountCouponKindLabel,
  discountCouponMinSubtotalInput,
  discountCouponOfferLabel,
  discountCouponUsageLabel,
  discountCouponValueInput,
  normalizeDiscountCouponCode,
  type DiscountCouponKindCode,
  type DiscountCouponSearchProduct,
  type DiscountCouponStatusCode,
  type DiscountCouponUsageCode,
} from "@/lib/discount-coupon-kinds";
import { ensureDiscountCouponSchema } from "@/lib/ensure-discount-coupon-schema";
import { prisma } from "@/lib/prisma";
import { toDatetimeLocalValue } from "@/lib/product-sale";

export type DiscountCouponWriteInput = {
  code: string;
  name: string;
  kind: DiscountCouponKindCode;
  valueInt: number;
  usageMode: DiscountCouponUsageCode;
  status?: DiscountCouponStatusCode;
  startsAt: Date | null;
  endsAt: Date | null;
  minSubtotalMinor: number;
  customerId: string | null;
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
};

function customerLabel(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  customerNo: number;
}) {
  const fromParts = joinFullName(row.firstName ?? "", row.lastName ?? "");
  const fromName = row.name?.trim() || null;
  const display = fromParts || fromName || splitFullName(row.name).firstName || row.email;
  return `#${row.customerNo} · ${display} · ${row.email}`;
}

async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  await ensureDiscountCouponSchema().catch(() => undefined);
  return fn();
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function validateTargets(input: {
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
  customerId: string | null;
  usageMode: DiscountCouponUsageCode;
}) {
  const categoryIds = uniqueIds(input.categoryIds);
  const brandIds = uniqueIds(input.brandIds);
  const productIds = uniqueIds(input.productIds);

  if (input.usageMode === "CUSTOMER") {
    if (!input.customerId) {
      return { error: "Müşteriye özel kod için müşteri seçin." };
    }
    const customer = await prisma.user.findFirst({
      where: { id: input.customerId, role: "MEMBER" },
      select: { id: true },
    });
    if (!customer) return { error: "Seçilen müşteri bulunamadı." };
  }

  if (categoryIds.length > 0) {
    const count = await prisma.productCategory.count({
      where: { id: { in: categoryIds } },
    });
    if (count !== categoryIds.length) {
      return { error: "Seçilen kategorilerden biri bulunamadı." };
    }
  }
  if (brandIds.length > 0) {
    const count = await prisma.brand.count({ where: { id: { in: brandIds } } });
    if (count !== brandIds.length) {
      return { error: "Seçilen markalardan biri bulunamadı." };
    }
  }
  if (productIds.length > 0) {
    const count = await prisma.product.count({ where: { id: { in: productIds } } });
    if (count !== productIds.length) {
      return { error: "Seçilen ürünlerden biri bulunamadı." };
    }
  }

  return {
    categoryIds,
    brandIds,
    productIds,
    customerId: input.usageMode === "CUSTOMER" ? input.customerId : null,
  };
}

function isUniqueCodeError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function loadAdminDiscountCouponPage(page = 1, pageSize = 30) {
  return withSchema(async () => {
    const take = Math.min(100, Math.max(1, pageSize));
    const current = Math.max(1, page);
    const skip = (current - 1) * take;
    const [total, rows] = await Promise.all([
      prisma.discountCoupon.count(),
      prisma.discountCoupon.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
        include: {
          customer: {
            select: {
              id: true,
              customerNo: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { categories: true, brands: true, products: true },
          },
        },
      }),
    ]);

    return {
      page: current,
      pageSize: take,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      coupons: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        kind: row.kind as DiscountCouponKindCode,
        kindLabel: discountCouponKindLabel(row.kind as DiscountCouponKindCode),
        offerLabel: discountCouponOfferLabel(
          row.kind as DiscountCouponKindCode,
          row.valueInt,
        ),
        usageMode: row.usageMode as DiscountCouponUsageCode,
        usageLabel: discountCouponUsageLabel(row.usageMode as DiscountCouponUsageCode),
        status: row.status as DiscountCouponStatusCode,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
        minSubtotalMinor: row.minSubtotalMinor,
        redemptionCount: row.redemptionCount,
        customerLabel: row.customer ? customerLabel(row.customer) : null,
        scopeSummary: [
          row._count.categories > 0 ? `${row._count.categories} kategori` : null,
          row._count.brands > 0 ? `${row._count.brands} marka` : null,
          row._count.products > 0 ? `${row._count.products} ürün` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Tüm sepet",
      })),
    };
  });
}

export async function loadAdminDiscountCouponForm(id: string) {
  return withSchema(async () => {
    const row = await prisma.discountCoupon.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true } },
        brands: { select: { brandId: true } },
        products: {
          select: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                image: true,
                brand: { select: { name: true } },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            customerNo: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if (!row) return null;

    const kind = row.kind as DiscountCouponKindCode;
    return {
      id: row.id,
      code: row.code,
      name: row.name ?? "",
      kind,
      value: discountCouponValueInput(kind, row.valueInt),
      usageMode: row.usageMode as DiscountCouponUsageCode,
      status: row.status as DiscountCouponStatusCode,
      startsAt: toDatetimeLocalValue(row.startsAt),
      endsAt: toDatetimeLocalValue(row.endsAt),
      minSubtotal: discountCouponMinSubtotalInput(row.minSubtotalMinor),
      customerId: row.customerId,
      customer: row.customer
        ? { id: row.customer.id, label: customerLabel(row.customer) }
        : null,
      categoryIds: row.categories.map((item) => item.categoryId),
      brandIds: row.brands.map((item) => item.brandId),
      products: row.products.map(
        (item): DiscountCouponSearchProduct => ({
          id: item.product.id,
          title: item.product.title,
          sku: item.product.sku,
          image: item.product.image,
          brandName: item.product.brand?.name ?? null,
        }),
      ),
    };
  });
}

export async function loadDiscountCouponFormLookups() {
  return loadCampaignFormLookups();
}

export async function searchDiscountCouponProducts(
  query: string,
): Promise<DiscountCouponSearchProduct[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: q } },
        { sku: { contains: q } },
        { slug: { contains: q } },
        {
          variants: {
            some: { OR: [{ sku: { contains: q } }, { barcode: { contains: q } }] },
          },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      sku: true,
      image: true,
      brand: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sku: row.sku,
    image: row.image,
    brandName: row.brand?.name ?? null,
  }));
}

export async function searchDiscountCouponCustomers(query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const rows = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        ...(Number.isFinite(Number(q)) ? [{ customerNo: Number(q) }] : []),
      ],
    },
    orderBy: [{ customerNo: "desc" }],
    take: 20,
    select: {
      id: true,
      customerNo: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    label: customerLabel(row),
  }));
}

export async function createDiscountCoupon(input: DiscountCouponWriteInput) {
  return withSchema(async () => {
    const code = normalizeDiscountCouponCode(input.code);
    if (code.length < 3) {
      return { error: "Kod en az 3 karakter olmalı." };
    }
    if (code.length > 64) {
      return { error: "Kod en fazla 64 karakter olabilir." };
    }

    const targets = await validateTargets(input);
    if ("error" in targets) return { error: targets.error };

    const name = input.name.trim() || null;

    try {
      const created = await prisma.discountCoupon.create({
        data: {
          code,
          name,
          kind: input.kind,
          valueInt: input.valueInt,
          usageMode: input.usageMode,
          status: input.status ?? "ACTIVE",
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          minSubtotalMinor: Math.max(0, input.minSubtotalMinor),
          customerId: targets.customerId,
          categories: {
            create: targets.categoryIds.map((categoryId) => ({ categoryId })),
          },
          brands: {
            create: targets.brandIds.map((brandId) => ({ brandId })),
          },
          products: {
            create: targets.productIds.map((productId) => ({ productId })),
          },
        },
        select: { id: true },
      });
      return { id: created.id };
    } catch (error) {
      if (isUniqueCodeError(error)) {
        return { error: "Bu indirim kodu zaten kayıtlı." };
      }
      throw error;
    }
  });
}

export async function updateDiscountCoupon(
  id: string,
  input: DiscountCouponWriteInput,
) {
  return withSchema(async () => {
    const existing = await prisma.discountCoupon.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { error: "Hediye çeki bulunamadı." };

    const code = normalizeDiscountCouponCode(input.code);
    if (code.length < 3) {
      return { error: "Kod en az 3 karakter olmalı." };
    }
    if (code.length > 64) {
      return { error: "Kod en fazla 64 karakter olabilir." };
    }

    const targets = await validateTargets(input);
    if ("error" in targets) return { error: targets.error };

    const name = input.name.trim() || null;

    try {
      await prisma.$transaction([
        prisma.discountCouponCategory.deleteMany({ where: { couponId: id } }),
        prisma.discountCouponBrand.deleteMany({ where: { couponId: id } }),
        prisma.discountCouponProduct.deleteMany({ where: { couponId: id } }),
        prisma.discountCoupon.update({
          where: { id },
          data: {
            code,
            name,
            kind: input.kind,
            valueInt: input.valueInt,
            usageMode: input.usageMode,
            status: input.status ?? "ACTIVE",
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            minSubtotalMinor: Math.max(0, input.minSubtotalMinor),
            customerId: targets.customerId,
            categories: {
              create: targets.categoryIds.map((categoryId) => ({ categoryId })),
            },
            brands: {
              create: targets.brandIds.map((brandId) => ({ brandId })),
            },
            products: {
              create: targets.productIds.map((productId) => ({ productId })),
            },
          },
        }),
      ]);
      return { id };
    } catch (error) {
      if (isUniqueCodeError(error)) {
        return { error: "Bu indirim kodu zaten kayıtlı." };
      }
      throw error;
    }
  });
}

export async function disableDiscountCoupon(id: string) {
  return withSchema(async () => {
    const existing = await prisma.discountCoupon.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return { error: "Hediye çeki bulunamadı." };
    if (existing.status === "DISABLED") return { id };
    await prisma.discountCoupon.update({
      where: { id },
      data: { status: "DISABLED" },
    });
    return { id };
  });
}
