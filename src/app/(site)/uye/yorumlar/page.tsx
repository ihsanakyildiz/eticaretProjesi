import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { catalogProductHref } from "@/lib/catalog-storefront";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";
import { reviewStatusLabel, type ReviewStatusCode } from "@/lib/reviews";
import { ensureMemberPortalAccess } from "../actions";

export const metadata: Metadata = {
  title: "Ürün yorumlarım",
  description: "Ürün yorumlarınızı görüntüleyin.",
};

function statusBadgeClass(status: ReviewStatusCode): string {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export default async function MemberProductReviewsPage() {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye/yorumlar");
  }

  const [settings, reviews] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    prisma.productReview.findMany({
      where: { userId: access.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { title: true, slug: true, urlId: true, image: true, brand: { select: { name: true } } } },
        order: { select: { reference: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
  ]);

  const urls = parseUrlStructure(settings);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Ürün yorumlarım</h2>
        <p className="mt-1 text-sm text-site-muted">Yorumlarınızın durumu ve varsa ekli fotoğraflar.</p>

        {reviews.length === 0 ? (
          <p className="mt-6 text-sm text-site-muted">Henüz yorum eklemediniz.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((review) => {
              const productHref = catalogProductHref(review.product.slug, urls, review.product.urlId);
              const status = review.status;
              const badgeClass = statusBadgeClass(status);
              const hasPhotos = review.images.length > 0;

              const canEdit = status === "PENDING" || status === "REJECTED";
              const tabParam = status === "REJECTED" ? "rejected" : "evaluate";

              return (
                <li key={review.id} className="rounded-2xl border border-site-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {review.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.product.image}
                          alt={review.product.title}
                          className="h-16 w-16 flex-none rounded-md border border-site-border object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <Link href={productHref} className="block text-sm font-semibold text-site-fg hover:underline">
                          {review.product.brand?.name ? `${review.product.brand.name} · ` : ""}
                          {review.product.title}
                        </Link>
                        <p className="mt-1 text-xs text-site-muted">
                          {review.rating}/5 · {reviewStatusLabel(status)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
                      >
                        {reviewStatusLabel(status)}
                      </span>
                      {canEdit ? (
                        <Link
                          href={`/uye/siparisler/${review.order.reference}/degerlendir?tab=${tabParam}`}
                          className="rounded-lg bg-site-primary px-3 py-2 text-xs font-medium text-white"
                        >
                          Değerlendirmeyi düzenle
                        </Link>
                      ) : (
                        <Link
                          href={productHref}
                          className="rounded-lg border border-site-border px-3 py-2 text-xs font-medium text-site-fg hover:bg-site-surface"
                        >
                          Ürünü görüntüle
                        </Link>
                      )}
                    </div>
                  </div>

                  {review.comment ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-site-fg">{review.comment}</p>
                  ) : null}

                  {hasPhotos ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {review.images.map((img) => (
                        <li key={img.url}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt="Yorum fotoğrafı"
                            className="h-20 w-20 rounded-md border border-site-border object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

