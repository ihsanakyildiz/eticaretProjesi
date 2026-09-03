import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { catalogProductHref } from "@/lib/catalog-storefront";
import { prisma } from "@/lib/prisma";
import { type ReviewStatusCode } from "@/lib/reviews";
import { parseUrlStructure } from "@/lib/url-structure";
import { getSettingsMap } from "@/lib/settings";
import { ReviewsTable } from "./reviews-table";

export const metadata: Metadata = {
  title: "Ürün yorumları",
  description: "Müşteri ürün yorumlarını onaylayın veya reddedin",
};

type PageProps = {
  searchParams: Promise<{ durum?: string }>;
};

function parseFilter(value: string | undefined): ReviewStatusCode | "ALL" {
  switch (value) {
    case "APPROVED":
    case "REJECTED":
    case "PENDING":
      return value;
    case "ALL":
      return "ALL";
    default:
      return "PENDING";
  }
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { durum } = await searchParams;
  const filter = parseFilter(durum);
  const [settings, rows] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    prisma.productReview.findMany({
      where: filter === "ALL" ? undefined : { status: filter },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { title: true, slug: true, urlId: true } },
        user: { select: { name: true, firstName: true, lastName: true, email: true } },
        order: { select: { reference: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
  ]);
  const urls = parseUrlStructure(settings);

  const tabs: { id: ReviewStatusCode | "ALL"; label: string }[] = [
    { id: "PENDING", label: "Onay bekleyen" },
    { id: "APPROVED", label: "Yayında" },
    { id: "REJECTED", label: "Reddedilen" },
    { id: "ALL", label: "Tümü" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Star className="h-5 w-5 text-[#f7b84b]" />
            Ürün yorumları
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Onaylanan yorumlar ürün detayında yayınlanır. İsterseniz daha sonra yayından
            kaldırabilirsiniz.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          const href = tab.id === "PENDING" ? "/admin/reviews" : `/admin/reviews?durum=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              className={
                active
                  ? "rounded-md bg-[#405189] px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-sm font-medium text-slate-600"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <ReviewsTable
        rows={rows.map((row) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          displayName: row.displayName,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          productTitle: row.product.title,
          productHref: catalogProductHref(row.product.slug, urls, row.product.urlId),
          customerName:
            [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
            row.user.name ||
            row.user.email,
          customerEmail: row.user.email,
          orderReference: row.order.reference,
          photos: row.images.map((image) => image.url),
        }))}
      />
    </div>
  );
}
