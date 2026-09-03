"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { StarRating } from "@/components/site/reviews/star-rating";
import { formatReviewDate } from "@/lib/reviews";

export type ProductFeatureRow = {
  id: string;
  name: string;
  value: string;
};

export type ProductReviewPublic = {
  id: string;
  rating: number;
  comment: string;
  author: string;
  createdAt: string;
  photos: string[];
};

type ProductDetailTab = "description" | "features" | "reviews";

function ProductReviewsPanel({
  reviews,
  average,
  count,
}: {
  reviews: ProductReviewPublic[];
  average: number;
  count: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  if (count === 0) {
    return <p className="text-sm text-site-muted">Bu ürün için henüz onaylanmış yorum yok.</p>;
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-semibold text-site-fg">{average.toFixed(1)}</p>
        <StarRating value={Math.round(average)} readOnly size="md" label="Ortalama puan" />
        <p className="text-sm text-site-muted">{count} değerlendirme</p>
      </div>
      <ul className="divide-y divide-site-border rounded-lg border border-site-border">
        {reviews.map((review) => (
          <li key={review.id} className="px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-site-fg">{review.author}</p>
              <p className="text-xs text-site-muted">{formatReviewDate(review.createdAt)}</p>
            </div>
            <div className="mt-1">
              <StarRating value={review.rating} readOnly size="sm" />
            </div>
            {review.comment ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-site-fg">{review.comment}</p>
            ) : null}
            {review.photos.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {review.photos.map((src) => (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => setPreview(src)}
                      className="relative block h-16 w-16 overflow-hidden rounded-md border border-site-border"
                    >
                      <SiteImage src={src} alt="Yorum görseli" fill className="object-cover" sizes="64px" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white"
            aria-label="Kapat"
            onClick={() => setPreview(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[80vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <SiteImage src={preview} alt="Yorum görseli" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderTab(
  tab: ProductDetailTab,
  descriptionHtml: string | null,
  features: ProductFeatureRow[],
  reviews: ProductReviewPublic[],
  average: number,
  count: number,
) {
  switch (tab) {
    case "description":
      return descriptionHtml ? (
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null;
    case "features":
      return (
        <dl className="divide-y divide-site-border rounded-lg border border-site-border">
          {features.map((row) => (
            <div key={row.id} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
              <dt className="text-site-muted">{row.name}</dt>
              <dd className="font-medium text-site-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "reviews":
      return <ProductReviewsPanel reviews={reviews} average={average} count={count} />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

export function ProductDetailTabs({
  descriptionHtml,
  features,
  reviews = [],
  reviewAverage = 0,
  reviewCount = 0,
}: {
  descriptionHtml: string | null;
  features: ProductFeatureRow[];
  reviews?: ProductReviewPublic[];
  reviewAverage?: number;
  reviewCount?: number;
}) {
  const hasDescription = Boolean(descriptionHtml);
  const hasFeatures = features.length > 0;
  const initial: ProductDetailTab = hasDescription ? "description" : hasFeatures ? "features" : "reviews";
  const [tab, setTab] = useState<ProductDetailTab>(initial);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-site-border">
        {hasDescription ? (
          <button
            type="button"
            onClick={() => setTab("description")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "description"
                ? "border-b-2 border-site-primary text-site-fg"
                : "text-site-muted hover:text-site-fg"
            }`}
          >
            Açıklama
          </button>
        ) : null}
        {hasFeatures ? (
          <button
            type="button"
            onClick={() => setTab("features")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "features"
                ? "border-b-2 border-site-primary text-site-fg"
                : "text-site-muted hover:text-site-fg"
            }`}
          >
            Özellikler
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={`px-4 py-2.5 text-sm font-medium ${
            tab === "reviews"
              ? "border-b-2 border-site-primary text-site-fg"
              : "text-site-muted hover:text-site-fg"
          }`}
        >
          Değerlendirmeler{reviewCount > 0 ? ` (${reviewCount})` : ""}
        </button>
      </div>
      <div className="pt-5">{renderTab(tab, descriptionHtml, features, reviews, reviewAverage, reviewCount)}</div>
    </div>
  );
}
