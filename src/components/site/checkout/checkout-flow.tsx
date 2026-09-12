"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrderAction, type PlaceOrderState } from "@/app/(site)/odeme/actions";
import { CartNotices } from "@/components/site/cart/cart-notices";
import { useCart } from "@/components/site/cart/cart-provider";
import { DemoModeBanner } from "@/components/site/demo-mode-banner";
import type { DemoNotice } from "@/lib/site-access";
import { CheckoutAddressForm } from "@/components/site/checkout/checkout-address-form";
import { usePerformance } from "@/components/site/performance-provider";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import type { CheckoutCardOption, CheckoutPaymentChoice } from "@/lib/checkout-payment-choice";
import type { CheckoutAddress, CheckoutCarrier, HydratedCart } from "@/lib/checkout-types";
import {
  CHECKOUT_STEPS,
  checkoutStepHref,
  checkoutStepLabel,
  clampCheckoutStep,
  firstSearchValue,
  type CheckoutQuery,
  type CheckoutStep,
} from "@/lib/checkout-steps";
import { formatMinorTry, taxExcludedMinor } from "@/lib/product-money";

const initialOrderState: PlaceOrderState = {};

function formatAddress(address: CheckoutAddress) {
  return [
    `${address.firstName} ${address.lastName}`,
    address.line1,
    [address.neighborhood, address.district, address.city].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CheckoutFlow({
  initialAddresses,
  initialCarriers,
  cardOptions,
  canceled,
  step: requestedStep,
  query,
  demoNotice = null,
}: {
  initialAddresses: CheckoutAddress[];
  initialCarriers: Array<{ id: string; name: string; logo: string | null }>;
  cardOptions: CheckoutCardOption[];
  canceled?: boolean;
  step: CheckoutStep;
  query: CheckoutQuery;
  demoNotice?: DemoNotice | null;
}) {
  const router = useRouter();
  const perf = usePerformance();
  const { ready, lines, selectedIds, hydrated, notices, dismissNotice } = useCart();
  const checkoutLines = useMemo(
    () =>
      lines.filter((line) => {
        if (!selectedIds.includes(line.variantId)) return false;
        if (!hydrated) return true;
        return hydrated.lines.some((row) => row.variantId === line.variantId && row.available);
      }),
    [hydrated, lines, selectedIds],
  );
  const cart = useMemo<HydratedCart | null>(() => {
    if (!hydrated) return null;
    const selected = hydrated.lines.filter(
      (line) => line.available && selectedIds.includes(line.variantId),
    );
    return {
      ...hydrated,
      lines: selected,
      productsMinor: selected.reduce((sum, line) => sum + line.totalMinor, 0),
      taxMinor: selected.reduce((sum, line) => {
        return sum + (line.totalMinor - taxExcludedMinor(line.totalMinor, line.taxRatePercent));
      }, 0),
      extraShippingMinor: selected.reduce((sum, line) => sum + line.extraShippingMinor, 0),
    };
  }, [hydrated, selectedIds]);
  const carriers = useMemo<CheckoutCarrier[]>(
    () =>
      initialCarriers.map((row) => ({
        ...row,
        priceMinor: cart?.extraShippingMinor ?? 0,
      })),
    [cart?.extraShippingMinor, initialCarriers],
  );
  const [addresses, setAddresses] = useState(initialAddresses);
  const [shippingId, setShippingId] = useState(
    initialAddresses.find((row) => row.isDefaultDelivery)?.id ?? initialAddresses[0]?.id ?? "",
  );
  const [billingId, setBillingId] = useState(
    initialAddresses.find((row) => row.isDefaultInvoice)?.id ?? initialAddresses[0]?.id ?? "",
  );
  const [sameBilling, setSameBilling] = useState(true);
  const [carrierId, setCarrierId] = useState(initialCarriers[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentChoice>("BANK_WIRE");
  const [showForm, setShowForm] = useState(initialAddresses.length === 0);
  const [orderState, formAction, pending] = useActionState(placeOrderAction, initialOrderState);
  const step = clampCheckoutStep(requestedStep, shippingId, carrierId);
  const queryKey = JSON.stringify(query);

  function goToStep(next: CheckoutStep) {
    const allowed = clampCheckoutStep(next, shippingId, carrierId);
    router.push(checkoutStepHref(allowed, query));
  }

  useEffect(() => {
    const current = firstSearchValue(query.adim);
    if (current === step) return;
    router.replace(checkoutStepHref(step, query));
  }, [query, queryKey, router, step]);

  useEffect(() => {
    if (orderState.redirectUrl) {
      router.push(orderState.redirectUrl);
    }
  }, [orderState.redirectUrl, router]);

  const shipping = useMemo(
    () => addresses.find((row) => row.id === shippingId) ?? null,
    [addresses, shippingId],
  );
  const carrier = carriers.find((row) => row.id === carrierId) ?? carriers[0] ?? null;
  const shippingMinor = carrier?.priceMinor ?? 0;
  const totalMinor = (cart?.productsMinor ?? 0) + shippingMinor;

  const deliveryAddresses = addresses.filter((row) => row.isDelivery) ;
  const invoiceAddresses = addresses.filter((row) => row.isInvoice);
  const deliveryPool = deliveryAddresses.length > 0 ? deliveryAddresses : addresses;
  const invoicePool = invoiceAddresses.length > 0 ? invoiceAddresses : addresses;

  function goNext() {
    switch (step) {
      case "adres":
        if (!shippingId) return;
        goToStep("kargo");
        return;
      case "kargo":
        if (!carrierId) return;
        goToStep("odeme");
        return;
      case "odeme":
        return;
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  }

  if (!ready && !orderState.redirectUrl) {
    return (
      <div className="rounded-lg border border-site-border bg-site-card px-6 py-16 text-center">
        <p className="text-sm text-site-muted">Sepet hazırlanıyor...</p>
      </div>
    );
  }

  if (checkoutLines.length === 0 && !orderState.redirectUrl) {
    return (
      <div>
        {demoNotice ? <DemoModeBanner notice={demoNotice} variant="panel" /> : null}
      <div className="rounded-lg border border-site-border bg-site-card px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-site-fg">
          {lines.length === 0 ? "Sepetiniz boş" : "Ödeme için satılabilir ürün seçilmedi"}
        </p>
        <SiteLink
          href="/sepet"
          prefetch={perf.checkoutPrefetch}
          className="mt-4 inline-flex text-sm font-semibold text-site-primary"
        >
          Sepete dön
        </SiteLink>
      </div>
      </div>
    );
  }

  return (
    <div>
      {demoNotice ? <DemoModeBanner notice={demoNotice} variant="panel" /> : null}
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <ol className="mb-6 flex gap-2 text-sm">
          {CHECKOUT_STEPS.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => goToStep(item)}
                className={`rounded-full px-3 py-1.5 ${
                  step === item
                    ? "bg-site-primary font-semibold text-white"
                    : "bg-site-surface text-site-muted"
                }`}
              >
                {index + 1}. {checkoutStepLabel(item)}
              </button>
            </li>
          ))}
        </ol>

        {canceled ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Kart ödemesi iptal edildi. Başka bir yöntem seçebilirsiniz.
          </p>
        ) : null}
        <CartNotices notices={notices} onDismiss={dismissNotice} />
        {orderState.error ? (
          <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {orderState.error}
          </p>
        ) : null}

        {step === "adres" ? (
          <section className="rounded-lg border border-site-border bg-site-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-site-fg">Teslimat adresi</h2>
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="shrink-0 text-sm font-semibold text-site-primary"
              >
                {showForm ? "Formu gizle" : "Yeni adres ekle"}
              </button>
            </div>
            {deliveryPool.length === 0 ? (
              <p className="mt-2 text-sm text-site-muted">Kayıtlı adresiniz yok. Aşağıdan ekleyin.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {deliveryPool.map((address) => (
                  <li key={address.id}>
                    <label className="flex cursor-pointer gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingId === address.id}
                        onChange={() => setShippingId(address.id)}
                      />
                      <span>
                        <span className="block font-medium text-site-fg">{address.alias}</span>
                        <span className="text-sm text-site-muted">{formatAddress(address)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm text-site-fg">
              <input
                type="checkbox"
                checked={sameBilling}
                onChange={(event) => setSameBilling(event.target.checked)}
              />
              Fatura adresi teslimat ile aynı
            </label>

            {!sameBilling ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-site-fg">Fatura adresi</h3>
                <ul className="mt-2 space-y-2">
                  {invoicePool.map((address) => (
                    <li key={address.id}>
                      <label className="flex cursor-pointer gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                        <input
                          type="radio"
                          name="billing"
                          checked={billingId === address.id}
                          onChange={() => setBillingId(address.id)}
                        />
                        <span className="text-sm text-site-muted">{formatAddress(address)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showForm ? (
              <CheckoutAddressForm
                onSaved={(next) => {
                  setAddresses(next);
                  setShowForm(false);
                  const newest = next[next.length - 1];
                  if (newest) {
                    setShippingId(newest.id);
                    setBillingId(newest.id);
                  }
                }}
              />
            ) : null}

            <button
              type="button"
              disabled={!shippingId}
              onClick={goNext}
              className="mt-6 rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Kargoya geç
            </button>
          </section>
        ) : null}

        {step === "kargo" ? (
          <section className="rounded-lg border border-site-border bg-site-card p-5">
            <h2 className="font-semibold text-site-fg">Kargo firması</h2>
            <ul className="mt-4 space-y-2">
              {carriers.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="carrier"
                        checked={carrierId === item.id}
                        onChange={() => setCarrierId(item.id)}
                      />
                      {item.logo ? (
                        <span className="relative h-8 w-8 overflow-hidden rounded bg-site-surface">
                          <SiteImage
                            src={item.logo}
                            alt=""
                            fill
                            className="object-contain"
                            sizes="32px"
                          />
                        </span>
                      ) : null}
                      <span className="font-medium text-site-fg">{item.name}</span>
                    </span>
                    <span className="text-sm text-site-fg">
                      {item.priceMinor > 0 ? formatMinorTry(item.priceMinor) : "Ücretsiz"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => goToStep("adres")} className="text-sm text-site-muted">
                Geri
              </button>
              <button
                type="button"
                disabled={!carrierId}
                onClick={goNext}
                className="rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ödemeye geç
              </button>
            </div>
          </section>
        ) : null}

        {step === "odeme" ? (
          <section className="rounded-lg border border-site-border bg-site-card p-5">
            <h2 className="font-semibold text-site-fg">Ödeme yöntemi</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <label className="flex cursor-pointer gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                  <input
                    type="radio"
                    checked={paymentMethod === "BANK_WIRE"}
                    onChange={() => setPaymentMethod("BANK_WIRE")}
                  />
                  <span>
                    <span className="block font-medium text-site-fg">Havale / EFT</span>
                    <span className="text-sm text-site-muted">Sipariş sonrası hesap bilgileri ile ödeme</span>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex cursor-pointer gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                  <input
                    type="radio"
                    checked={paymentMethod === "CASH_ON_DELIVERY"}
                    onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                  />
                  <span>
                    <span className="block font-medium text-site-fg">Kapıda ödeme</span>
                    <span className="text-sm text-site-muted">Teslimatta nakit veya kart</span>
                  </span>
                </label>
              </li>
              {cardOptions.map((option) => (
                <li key={option.id}>
                  <label className="flex cursor-pointer gap-3 rounded-md border border-site-border p-3 has-[:checked]:border-site-primary">
                    <input
                      type="radio"
                      checked={paymentMethod === option.id}
                      onChange={() => setPaymentMethod(option.id)}
                    />
                    <span>
                      <span className="block font-medium text-site-fg">{option.title}</span>
                      <span className="text-sm text-site-muted">{option.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <form action={formAction} className="mt-6">
              <input type="hidden" name="cartJson" value={JSON.stringify(checkoutLines)} />
              <input type="hidden" name="shippingAddressId" value={shippingId} />
              <input type="hidden" name="billingAddressId" value={sameBilling ? shippingId : billingId} />
              <input type="hidden" name="carrierId" value={carrierId} />
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <div className="flex gap-3">
                <button type="button" onClick={() => goToStep("kargo")} className="text-sm text-site-muted">
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={pending || !shipping}
                  className="rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {pending ? "İşleniyor..." : "Siparişi tamamla"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>

      <aside className="h-fit rounded-lg border border-site-border bg-site-card p-5 lg:sticky lg:top-28">
        <h2 className="text-sm font-semibold text-site-fg">Özet</h2>
        <ul className="mt-3 space-y-2 text-sm text-site-muted">
          {(cart?.lines ?? []).map((line, index) => (
            <li key={line.variantId} className="flex justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {line.image ? (
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-site-surface">
                    <SiteImage
                      src={line.image}
                      alt=""
                      fill
                      priority={index < perf.checkoutImageEager}
                      className="object-cover"
                      sizes="32px"
                    />
                  </span>
                ) : null}
                <span className="truncate">
                  {line.title} × {line.quantity}
                </span>
              </span>
              <span className="shrink-0 text-site-fg">{formatMinorTry(line.totalMinor)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-site-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-site-muted">Ürünler</dt>
            <dd>{formatMinorTry(cart?.productsMinor ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-site-muted">Kargo</dt>
            <dd>{shippingMinor > 0 ? formatMinorTry(shippingMinor) : "Ücretsiz"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-lg font-bold text-site-fg">{formatMinorTry(totalMinor)}</p>
        {shipping ? (
          <p className="mt-3 text-xs text-site-muted">Teslimat: {formatAddress(shipping)}</p>
        ) : null}
      </aside>
    </div>
    </div>
  );
}
