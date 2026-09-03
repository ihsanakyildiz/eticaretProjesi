"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { ProductReviewModal, type ProductReviewTarget } from "@/components/site/reviews/product-review-modal";
import { StarRating } from "@/components/site/reviews/star-rating";
import {
  submitOrderFeedbackAction,
  type ReviewFormState,
} from "@/app/(site)/uye/siparisler/review-actions";
import {
  ORDER_FEEDBACK_MAX_LENGTH,
  reviewStatusLabel,
  type ReviewStatusCode,
} from "@/lib/reviews";

const initialState: ReviewFormState = {};

function FeedbackCard({
  title,
  hint,
  reference,
  kind,
  initialRating,
  initialComment,
  enabled,
  disabledHint,
}: {
  title: string;
  hint: string;
  reference: string;
  kind: "ORDER" | "SHIPMENT";
  initialRating: number;
  initialComment: string;
  enabled: boolean;
  disabledHint: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [state, action, pending] = useActionState(submitOrderFeedbackAction, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <section className="rounded-2xl border border-site-border bg-site-card p-5">
      <h3 className="text-base font-semibold text-site-fg">{title}</h3>
      <p className="mt-1 text-sm text-site-muted">{hint}</p>
      {enabled ? (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="rating" value={rating || ""} />
          <StarRating value={rating} onChange={setRating} label={title} />
          <textarea
            name="comment"
            maxLength={ORDER_FEEDBACK_MAX_LENGTH}
            defaultValue={initialComment}
            placeholder="İsteğe bağlı yorum"
            className="min-h-20 w-full rounded-lg border border-site-border px-3 py-2 text-sm outline-none placeholder:text-site-muted focus:border-site-primary"
          />
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
          <button
            type="submit"
            disabled={pending || rating < 1}
            className="rounded-lg bg-site-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Kaydediliyor..." : initialRating > 0 ? "Güncelle" : "Gönder"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-site-muted">{disabledHint}</p>
      )}
    </section>
  );
}

export type PurchasedProductRow = {
  orderItemId: string;
  productId: string;
  title: string;
  brandName: string | null;
  image: string | null;
  fromCurrentOrder: boolean;
  review: {
    rating: number;
    comment: string;
    displayName: boolean;
    status: ReviewStatusCode;
    photos: string[];
  } | null;
};

export type ProductReviewTab = "evaluate" | "approved" | "rejected";

function productTab(item: PurchasedProductRow): ProductReviewTab {
  const status = item.review?.status;
  if (!status) return "evaluate";
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "PENDING":
      return "evaluate";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function emptyTabMessage(tab: ProductReviewTab): string {
  switch (tab) {
    case "evaluate":
      return "Değerlendirilecek ürün kalmadı.";
    case "approved":
      return "Onaylanmış yorumunuz yok.";
    case "rejected":
      return "Reddedilmiş yorumunuz yok.";
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

function evaluateButtonLabel(item: PurchasedProductRow): string {
  if (!item.review) return "Ürünü değerlendir";
  switch (item.review.status) {
    case "PENDING":
      return "Düzenle";
    case "REJECTED":
      return "Tekrar gönder";
    case "APPROVED":
      return "Yayında";
    default: {
      const _exhaustive: never = item.review.status;
      return _exhaustive;
    }
  }
}

export function OrderEvaluateForm({
  reference,
  orderRating,
  orderComment,
  shipmentRating,
  shipmentComment,
  canRateOrder,
  canRateShipment,
  products,
  initialTab,
}: {
  reference: string;
  orderRating: number;
  orderComment: string;
  shipmentRating: number;
  shipmentComment: string;
  canRateOrder: boolean;
  canRateShipment: boolean;
  products: PurchasedProductRow[];
  initialTab?: ProductReviewTab;
}) {
  const [selected, setSelected] = useState<ProductReviewTarget | null>(null);
  const [tab, setTab] = useState<ProductReviewTab>(initialTab ?? "evaluate");
  const evaluateCount = products.filter((item) => productTab(item) === "evaluate").length;
  const approvedCount = products.filter((item) => productTab(item) === "approved").length;
  const rejectedCount = products.filter((item) => productTab(item) === "rejected").length;
  const visible = products.filter((item) => productTab(item) === tab);

  const tabs: { id: ProductReviewTab; label: string }[] = [
    { id: "evaluate", label: "Değerlendir" },
    { id: "approved", label: `Onaylanan (${approvedCount})` },
    { id: "rejected", label: `Reddedilen (${rejectedCount})` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <FeedbackCard
          title="Siparişi değerlendir"
          hint="Sipariş süreci, paketleme ve genel deneyiminiz."
          reference={reference}
          kind="ORDER"
          initialRating={orderRating}
          initialComment={orderComment}
          enabled={canRateOrder}
          disabledHint="Sipariş teslim edildikten sonra değerlendirilebilir."
        />
        <FeedbackCard
          title="Kargoyu değerlendir"
          hint="Kargo süresi, teslimat ve kargo firması deneyiminiz."
          reference={reference}
          kind="SHIPMENT"
          initialRating={shipmentRating}
          initialComment={shipmentComment}
          enabled={canRateShipment}
          disabledHint="Kargo yola çıktıktan sonra değerlendirilebilir."
        />
      </div>

      <section className="rounded-2xl border border-site-border bg-site-card p-5">
        <h3 className="text-base font-semibold text-site-fg">Ürünleri değerlendir</h3>
        <p className="mt-1 text-sm text-site-muted">
          Satın aldığınız ürünler. İsterseniz fotoğraf ekleyin; yorumlar onaylandıktan sonra ürün
          sayfasında görünür.
        </p>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-site-border">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-2 text-sm font-medium ${
                tab === item.id
                  ? "border-b-2 border-site-primary text-site-primary"
                  : "text-site-muted hover:text-site-fg"
              }`}
            >
              {item.id === "evaluate" && evaluateCount > 0 ? `${item.label} (${evaluateCount})` : item.label}
            </button>
          ))}
        </div>
        {products.length === 0 ? (
          <p className="mt-4 text-sm text-site-muted">Değerlendirilecek teslim edilmiş ürün yok.</p>
        ) : visible.length === 0 ? (
          <p className="mt-4 text-sm text-site-muted">{emptyTabMessage(tab)}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((item) => {
              const locked = item.review?.status === "APPROVED";
              return (
                <li
                  key={item.orderItemId}
                  className="flex flex-col overflow-hidden rounded-xl border border-site-border bg-white shadow-sm"
                >
                  <div className="relative aspect-square bg-site-surface">
                    {item.image ? (
                      <SiteImage src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
                    ) : (
                      <SiteImageFallback fill />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {item.brandName ? (
                      <p className="text-xs font-semibold text-site-fg">{item.brandName}</p>
                    ) : null}
                    <p className="mt-0.5 line-clamp-2 text-sm text-site-muted">{item.title}</p>
                    {item.review ? (
                      <div className="mt-2 space-y-1">
                        <StarRating value={item.review.rating} readOnly size="sm" />
                        <p className="text-xs text-site-muted">
                          {reviewStatusLabel(item.review.status)}
                          {item.review.photos.length > 0 ? ` · ${item.review.photos.length} fotoğraf` : ""}
                        </p>
                      </div>
                    ) : null}
                    {locked ? (
                      <p className="mt-auto pt-3 text-center text-xs font-medium text-emerald-700">Yayında</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            orderItemId: item.orderItemId,
                            productId: item.productId,
                            title: item.title,
                            brandName: item.brandName,
                            image: item.image,
                            rating: item.review?.rating ?? 0,
                            comment: item.review?.comment ?? "",
                            displayName: item.review?.displayName ?? true,
                            photos: item.review?.photos ?? [],
                          })
                        }
                        className="mt-auto w-full rounded-lg border border-site-primary px-2 py-2 text-sm font-medium text-site-primary hover:bg-site-primary hover:text-white"
                      >
                        {evaluateButtonLabel(item)}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected ? (
        <ProductReviewModal
          key={selected.orderItemId}
          reference={reference}
          product={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
