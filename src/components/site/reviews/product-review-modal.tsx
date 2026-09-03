"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { ReviewPhotoPicker } from "@/components/site/reviews/review-photo-picker";
import { StarRating } from "@/components/site/reviews/star-rating";
import { SiteLink } from "@/components/site/site-link";
import {
  submitProductReviewAction,
  type ReviewFormState,
} from "@/app/(site)/uye/siparisler/review-actions";
import { PRODUCT_REVIEW_MAX_LENGTH } from "@/lib/reviews";

export type ProductReviewTarget = {
  orderItemId: string;
  productId: string;
  title: string;
  brandName: string | null;
  image: string | null;
  rating: number;
  comment: string;
  displayName: boolean;
  photos: string[];
};

const initialState: ReviewFormState = {};

export function ProductReviewModal({
  reference,
  product,
  onClose,
}: {
  reference: string;
  product: ProductReviewTarget;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(product.rating || 0);
  const [comment, setComment] = useState(product.comment);
  const [photos, setPhotos] = useState<{ keepUrls: string[]; files: File[] }>({
    keepUrls: product.photos,
    files: [],
  });
  const [state, action, pending] = useActionState(submitProductReviewAction, initialState);
  const handlePhotos = useCallback((next: { keepUrls: string[]; files: File[] }) => {
    setPhotos(next);
  }, []);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onClose();
  }, [onClose, router, state.success]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submitWithPhotos(formData: FormData) {
    for (const url of photos.keepUrls) {
      formData.append("keepImage", url);
    }
    for (const file of photos.files) {
      formData.append("photos", file);
    }
    action(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="product-review-title"
        aria-modal="true"
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="product-review-title" className="text-lg font-semibold text-site-fg">
            Ürünü Değerlendir
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-site-muted hover:bg-site-surface hover:text-site-fg"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-site-border bg-site-surface">
            {product.image ? (
              <SiteImage src={product.image} alt={product.title} fill className="object-cover" sizes="64px" />
            ) : (
              <SiteImageFallback fill />
            )}
          </div>
          <div className="min-w-0">
            {product.brandName ? (
              <p className="text-sm font-semibold text-site-fg">{product.brandName}</p>
            ) : null}
            <p className="text-sm text-site-muted">{product.title}</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-site-muted">
          Ürünü aşağıdan puanlayabilir, yorum yazabilir ve fotoğraf ekleyebilirsin.
        </p>
        <div className="mt-3">
          <StarRating value={rating} onChange={setRating} size="lg" label="Ürün puanı" />
        </div>

        <form action={submitWithPhotos} className="mt-5 space-y-4">
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="orderItemId" value={product.orderItemId} />
          <input type="hidden" name="rating" value={rating || ""} />

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="product-review-comment" className="text-sm font-medium text-site-fg">
                Yorumunu Yaz
              </label>
              <SiteLink href="/gizlilik" className="text-xs text-site-primary hover:underline">
                Yorum Yayınlama Kriterleri
              </SiteLink>
            </div>
            <textarea
              id="product-review-comment"
              name="comment"
              required
              maxLength={PRODUCT_REVIEW_MAX_LENGTH}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Fiyatı uygundu. Ürün kısa zamanda elime ulaştı, paketleme güzeldi."
              className="min-h-32 w-full rounded-lg border border-site-border px-3 py-2.5 text-sm text-site-fg outline-none placeholder:text-site-muted focus:border-site-primary"
            />
            <p className="mt-1 text-right text-xs text-site-muted">
              {comment.length}/{PRODUCT_REVIEW_MAX_LENGTH}
            </p>
          </div>

          <ReviewPhotoPicker existingUrls={product.photos} disabled={pending} onChange={handlePhotos} />

          <label className="flex items-start gap-2 text-xs leading-relaxed text-site-muted">
            <input
              type="checkbox"
              name="displayName"
              defaultChecked={product.displayName}
              className="mt-0.5"
            />
            <span>
              Yorumlarda ismimin gözükmesine ve yorum detaylarının platform genelinde kullanılmasına
              izin veriyorum. Aydınlatma metni için{" "}
              <SiteLink href="/gizlilik" className="text-site-primary underline">
                tıklayınız
              </SiteLink>
              .
            </span>
          </label>
          <p className="text-[11px] leading-relaxed text-site-muted">
            Sağlık beyanı veya tıbbi öneri içeren değerlendirmeler ilgili mevzuata aykırı olduğundan
            yayımlanmamaktadır.
          </p>

          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

          <button
            type="submit"
            disabled={pending || rating < 1}
            className="w-full rounded-lg bg-site-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </form>
      </div>
    </div>
  );
}
