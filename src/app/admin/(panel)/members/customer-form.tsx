"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { PhoneInput } from "@/components/phone-input";
import {
  CUSTOMER_GROUPS,
  CUSTOMER_TITLES,
  customerGroupLabel,
  customerTitleLabel,
  type AddressDraft,
  type CustomerGroupCode,
  type CustomerTitleCode,
} from "@/lib/customers";
import { CustomerAddressesEditor } from "./customer-addresses-editor";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerFormState,
} from "./actions";

const initialState: CustomerFormState = {};

export type CustomerFormValues = {
  id?: string;
  customerNo?: number;
  firstName?: string;
  lastName?: string;
  title?: CustomerTitleCode;
  customerGroup?: CustomerGroupCode;
  email?: string;
  phone?: string;
  notes?: string;
  isActive?: boolean;
  newsletter?: boolean;
  partnerOffers?: boolean;
  addresses?: AddressDraft[];
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

export function CustomerForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: CustomerFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createCustomerAction : updateCustomerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [addresses, setAddresses] = useState<AddressDraft[]>(initial?.addresses ?? []);

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.redirectId) {
      router.push(`/admin/members/${state.redirectId}`);
      router.refresh();
    }
  }, [state.success, state.redirectId, mode, router]);

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="addressesJson" value={JSON.stringify(addresses)} />

      {state.error ? (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.success && mode === "edit" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <section className="space-y-5 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Hesap bilgileri</h2>
          {mode === "edit" && initial?.customerNo ? (
            <p className="mt-1 text-sm text-slate-500">Müşteri no: {initial.customerNo}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Sosyal unvan</label>
            <select name="title" defaultValue={initial?.title ?? "MR"} className={inputClass}>
              {CUSTOMER_TITLES.map((title) => (
                <option key={title} value={title}>
                  {customerTitleLabel(title)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Grup</label>
            <select
              name="customerGroup"
              defaultValue={initial?.customerGroup ?? "CUSTOMER"}
              className={inputClass}
            >
              {CUSTOMER_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {customerGroupLabel(group)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Ad *</label>
            <input
              name="firstName"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputClass}
            />
            {state.fieldErrors?.firstName ? (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.firstName}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Soyad *</label>
            <input
              name="lastName"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={inputClass}
            />
            {state.fieldErrors?.lastName ? (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.lastName}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">E-posta *</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={initial?.email ?? ""}
              className={inputClass}
            />
          </div>
          <PhoneInput name="phone" defaultValue={initial?.phone ?? ""} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {mode === "create" ? "Şifre *" : "Yeni şifre (opsiyonel)"}
            </label>
            <input
              name="password"
              type="password"
              minLength={mode === "create" ? 6 : undefined}
              required={mode === "create"}
              placeholder={mode === "edit" ? "Değiştirmek için yazın" : "En az 6 karakter"}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Admin notu</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={initial?.notes ?? ""}
              placeholder="Yalnızca yönetim panelinde görünür"
              className={`${inputClass} resize-y`}
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-3">
            <AdminSwitch name="isActive" label="Etkin müşteri" defaultChecked={initial?.isActive ?? true} />
            <AdminSwitch
              name="newsletter"
              label="Haber bülteni"
              description="Kampanya ve duyuru e-postaları"
              defaultChecked={initial?.newsletter ?? false}
            />
            <AdminSwitch
              name="partnerOffers"
              label="Ortakların teklifleri"
              description="İş ortaklarından ticari ileti izni"
              defaultChecked={initial?.partnerOffers ?? false}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <CustomerAddressesEditor
          addresses={addresses}
          onChange={setAddresses}
          defaultName={{ firstName, lastName }}
        />
      </section>

      <div className="flex justify-between rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <Link
          href="/admin/members"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          Listeye dön
        </Link>
        <Can resource="customers" action={mode === "create" ? "create" : "update"}>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Müşteri oluştur" : "Kaydet"}
          </button>
        </Can>
      </div>
    </form>
  );
}
