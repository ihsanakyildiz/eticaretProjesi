"use client";

import { useActionState, useState } from "react";
import { AddressLocationFields } from "@/components/admin/address-location-fields";
import { PhoneInput } from "@/components/phone-input";
import { saveMemberAddressAction, type ProfileFormState } from "../actions";

const initialState: ProfileFormState = {};

const inputClass =
  "w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm text-site-fg outline-none focus:border-site-primary";

export function MemberAddressForm() {
  const [state, formAction, pending] = useActionState(saveMemberAddressAction, initialState);
  const [location, setLocation] = useState({
    country: "Türkiye",
    city: "",
    district: "",
    neighborhood: "",
    postalCode: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="country" value={location.country} />
      <input type="hidden" name="city" value={location.city} />
      <input type="hidden" name="district" value={location.district} />
      <input type="hidden" name="neighborhood" value={location.neighborhood} />
      <input type="hidden" name="postalCode" value={location.postalCode} />

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="firstName" required placeholder="Ad" className={inputClass} />
        <input name="lastName" required placeholder="Soyad" className={inputClass} />
        <div className="sm:col-span-2">
          <PhoneInput name="phone" variant="site" label="" />
        </div>
        <input name="alias" placeholder="Adres adı (Ev, İş)" className={`${inputClass} sm:col-span-2`} />
        <input name="line1" required placeholder="Açık adres" className={`${inputClass} sm:col-span-2`} />
      </div>

      <AddressLocationFields
        value={location}
        onChange={(patch) => setLocation((current) => ({ ...current, ...patch }))}
      />

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
        className="rounded-full bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Kaydediliyor..." : "Adresi kaydet"}
      </button>
    </form>
  );
}
