"use client";

import { useState, useTransition } from "react";
import { useCart } from "@/components/site/cart/cart-provider";
import { formatMinorTry } from "@/lib/product-money";

export function CartCouponBox({
  disabled = false,
  discountMinor,
}: {
  disabled?: boolean;
  discountMinor?: number;
}) {
  const { couponCode, couponPending, hydrated, applyCoupon, clearCoupon } = useCart();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || couponPending;
  const applied = hydrated?.coupon;
  const shownDiscount = discountMinor ?? applied?.discountMinor ?? 0;

  if (applied && couponCode) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
              Hediye çeki
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-site-fg">{applied.code}</p>
            <p className="text-xs text-emerald-700">
              {applied.offerLabel}
              {applied.name ? ` · ${applied.name}` : ""}
            </p>
            {shownDiscount > 0 ? (
              <p className="mt-1 text-sm font-semibold text-emerald-800">
                −{formatMinorTry(shownDiscount)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              clearCoupon();
              setDraft("");
            }}
            className="shrink-0 text-xs font-semibold text-site-muted hover:text-rose-600 disabled:opacity-50"
          >
            Kaldır
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="mb-1 block text-xs font-medium text-site-muted">İndirim / hediye çeki</label>
      <div className="flex gap-2">
        <input
          value={draft}
          disabled={disabled || busy}
          onChange={(event) => {
            setDraft(event.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Kod girin"
          className="min-w-0 flex-1 rounded-md border border-site-border bg-white px-3 py-2 text-sm font-mono uppercase text-site-fg outline-none focus:border-site-primary disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || busy || draft.trim().length < 3}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await applyCoupon(draft);
              if (result) setError(result);
              else setDraft("");
            });
          }}
          className="rounded-md bg-site-surface px-3 py-2 text-sm font-semibold text-site-fg hover:bg-site-border/60 disabled:opacity-50"
        >
          {busy ? "…" : "Uygula"}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
