"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { resolveCartAction } from "@/app/(site)/sepet/actions";
import { useCart } from "@/components/site/cart/cart-provider";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import type { HydratedCart } from "@/lib/checkout-types";
import { formatMinorTry } from "@/lib/product-money";

export function CartPage() {
  const { lines, setQuantity, removeItem } = useCart();
  const [cart, setCart] = useState<HydratedCart | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveCartAction(lines).then((next) => {
      if (!cancelled) setCart(next);
    });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-site-border bg-site-card px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-site-fg">Sepetiniz boş</p>
        <p className="mt-2 text-sm text-site-muted">Ürün ekleyip alışverişe devam edebilirsiniz.</p>
        <SiteLink
          href="/katalog"
          className="mt-6 inline-flex rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Alışverişe başla
        </SiteLink>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        {(cart?.lines ?? []).map((line) => (
          <article
            key={line.variantId}
            className="flex gap-4 rounded-lg border border-site-border bg-site-card p-4"
          >
            <SiteLink href={line.href} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-site-surface">
              {line.image ? (
                <SiteImage src={line.image} alt={line.title} fill className="object-cover" sizes="96px" />
              ) : null}
            </SiteLink>
            <div className="min-w-0 flex-1">
              <SiteLink href={line.href} className="font-semibold text-site-fg hover:text-site-primary">
                {line.title}
              </SiteLink>
              {line.variantTitle ? (
                <p className="mt-0.5 text-sm text-site-muted">{line.variantTitle}</p>
              ) : null}
              <p className="mt-2 text-sm font-medium text-site-fg">{formatMinorTry(line.unitPriceMinor)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-md border border-site-border">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                    className="px-3 py-1.5 text-lg"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                    className="px-3 py-1.5 text-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(line.variantId)}
                  className="inline-flex items-center gap-1 text-sm text-site-muted hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Kaldır
                </button>
              </div>
            </div>
            <p className="hidden shrink-0 text-sm font-semibold text-site-fg sm:block">
              {formatMinorTry(line.totalMinor)}
            </p>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-lg border border-site-border bg-site-card p-5 lg:sticky lg:top-28">
        <h2 className="text-sm font-semibold text-site-fg">Sipariş özeti</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-site-muted">Ürünler</dt>
            <dd className="font-medium text-site-fg">{formatMinorTry(cart?.productsMinor ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-site-muted">KDV</dt>
            <dd className="text-site-fg">{formatMinorTry(cart?.taxMinor ?? 0)}</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-site-border pt-4 text-lg font-bold text-site-fg">
          {formatMinorTry(cart?.productsMinor ?? 0)}
        </p>
        <p className="mt-1 text-xs text-site-muted">Kargo ücreti sonraki adımda hesaplanır.</p>
        <SiteLink
          href="/odeme?adim=adres"
          className="mt-5 flex w-full items-center justify-center rounded-md bg-site-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Ödemeye geç
        </SiteLink>
      </aside>
    </div>
  );
}
