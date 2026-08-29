"use client";

import { useActionState, useEffect, useState } from "react";
import { AddressLocationFields } from "@/components/admin/address-location-fields";
import { PhoneInput } from "@/components/phone-input";
import { saveCheckoutAddressAction, type CheckoutAddressState } from "@/app/(site)/odeme/actions";
import type { CheckoutAddress } from "@/lib/checkout-types";

const initialState: CheckoutAddressState = {};

const inputClass =
  "w-full rounded-md border border-site-border bg-site-card px-3 py-2.5 text-sm text-site-fg outline-none focus:border-site-primary";

export function CheckoutAddressForm({
  onSaved,
}: {
  onSaved: (addresses: CheckoutAddress[]) => void;
}) {
  const [state, formAction, pending] = useActionState(saveCheckoutAddressAction, initialState);
  const [location, setLocation] = useState({
    country: "Türkiye",
    city: "",
    district: "",
    neighborhood: "",
    postalCode: "",
  });

  useEffect(() => {
    if (state.success && state.addresses) onSaved(state.addresses);
  }, [onSaved, state]);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-lg border border-dashed border-site-border p-4">
      <input type="hidden" name="country" value={location.country} />
      <input type="hidden" name="city" value={location.city} />
      <input type="hidden" name="district" value={location.district} />
      <input type="hidden" name="neighborhood" value={location.neighborhood} />
      <input type="hidden" name="postalCode" value={location.postalCode} />

      <p className="text-sm font-semibold text-site-fg">Yeni adres ekle</p>
      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="firstName" required placeholder="Ad" className={inputClass} />
        <input name="lastName" required placeholder="Soyad" className={inputClass} />
        <div className="sm:col-span-2">
          <PhoneInput name="phone" variant="site" label="" />
        </div>
        <input name="alias" placeholder="Adres adı (Ev, İş)" className={`${inputClass} sm:col-span-2`} />
        <input name="line1" required placeholder="Açık adres" className={`${inputClass} sm:col-span-2`} />
      </div>

      <AddressLocationFields value={location} onChange={(patch) => setLocation((current) => ({ ...current, ...patch }))} />

      <label className="flex items-center gap-2 text-sm text-site-fg">
        <input type="checkbox" name="isCorporateInvoice" className="rounded border-site-border" />
        Kurumsal fatura
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="company" placeholder="Ünvan" className={inputClass} />
        <input name="taxOffice" placeholder="Vergi dairesi" className={inputClass} />
        <input name="taxNumber" placeholder="Vergi no" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-site-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Kaydediliyor..." : "Adresi kaydet"}
      </button>
    </form>
  );
}
