"use client";

import { MapPin, Plus, Trash2 } from "lucide-react";
import { AddressLocationFields } from "@/components/admin/address-location-fields";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { PhoneInput } from "@/components/phone-input";
import { emptyAddressDraft, type AddressDraft } from "@/lib/customers";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

type Props = {
  addresses: AddressDraft[];
  onChange: (addresses: AddressDraft[]) => void;
  defaultName: { firstName: string; lastName: string };
};

function patchAt(list: AddressDraft[], index: number, patch: Partial<AddressDraft>): AddressDraft[] {
  return list.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function CustomerAddressesEditor({ addresses, onChange, defaultName }: Props) {
  const addAddress = () => {
    const isFirst = addresses.length === 0;
    onChange([
      ...addresses,
      emptyAddressDraft({
        firstName: defaultName.firstName,
        lastName: defaultName.lastName,
        alias: isFirst ? "Ev" : "",
        isDefaultDelivery: isFirst,
        isDefaultInvoice: isFirst,
      }),
    ]);
  };

  const setDefault = (index: number, field: "isDefaultDelivery" | "isDefaultInvoice") => {
    const typeField = field === "isDefaultDelivery" ? "isDelivery" : "isInvoice";
    onChange(
      addresses.map((item, itemIndex) => ({
        ...item,
        [field]: itemIndex === index,
        ...(itemIndex === index ? { [typeField]: true } : {}),
      })),
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <MapPin className="h-4 w-4 text-[#405189]" />
            Adres defteri
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Teslimat ve fatura adresleri ayrı kaydedilebilir. Kurumsal fatura açılmazsa fatura
            kişi adına kesilir.
          </p>
        </div>
        <button
          type="button"
          onClick={addAddress}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#0ab39c] hover:text-[#0ab39c]"
        >
          <Plus className="h-4 w-4" />
          Adres ekle
        </button>
      </div>

      {addresses.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#e9ebec] bg-[#f8f9fa] px-4 py-6 text-center text-sm text-slate-500">
          Henüz kayıtlı adres yok. Müşteri birden fazla teslimat veya fatura adresi tutabilir.
        </p>
      ) : (
        <div className="space-y-4">
          {addresses.map((address, index) => (
            <div key={address.id ?? `new-${index}`} className="rounded-lg border border-[#e9ebec] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Adres {index + 1}</p>
                <button
                  type="button"
                  onClick={() => onChange(addresses.filter((_, itemIndex) => itemIndex !== index))}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Kaldır
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Kısa ad</label>
                  <input
                    value={address.alias}
                    onChange={(event) => onChange(patchAt(addresses, index, { alias: event.target.value }))}
                    placeholder="Ev, İş, Depo…"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-4 pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={address.isDelivery}
                      onChange={(event) =>
                        onChange(
                          patchAt(addresses, index, {
                            isDelivery: event.target.checked,
                            isDefaultDelivery: event.target.checked ? address.isDefaultDelivery : false,
                          }),
                        )
                      }
                    />
                    Teslimat
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={address.isInvoice}
                      onChange={(event) =>
                        onChange(
                          patchAt(addresses, index, {
                            isInvoice: event.target.checked,
                            isDefaultInvoice: event.target.checked ? address.isDefaultInvoice : false,
                          }),
                        )
                      }
                    />
                    Fatura
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Ad *</label>
                  <input
                    value={address.firstName}
                    onChange={(event) => onChange(patchAt(addresses, index, { firstName: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Soyad *</label>
                  <input
                    value={address.lastName}
                    onChange={(event) => onChange(patchAt(addresses, index, { lastName: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <PhoneInput
                  label="Telefon numarası"
                  labelClassName="mb-1 block text-xs font-medium text-slate-600"
                  value={address.phone}
                  onChange={(phone) => onChange(patchAt(addresses, index, { phone }))}
                />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Adres satırı 1 *</label>
                  <input
                    value={address.line1}
                    onChange={(event) => onChange(patchAt(addresses, index, { line1: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Adres satırı 2</label>
                  <input
                    value={address.line2}
                    onChange={(event) => onChange(patchAt(addresses, index, { line2: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <AddressLocationFields
                  value={{
                    country: address.country,
                    city: address.city,
                    district: address.district,
                    neighborhood: address.neighborhood,
                    postalCode: address.postalCode,
                  }}
                  onChange={(patch) => onChange(patchAt(addresses, index, patch))}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-4 border-t border-[#e9ebec] pt-3 text-sm">
                {address.isDelivery ? (
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="radio"
                      name="defaultDelivery"
                      checked={address.isDefaultDelivery}
                      onChange={() => setDefault(index, "isDefaultDelivery")}
                    />
                    Varsayılan teslimat
                  </label>
                ) : null}
                {address.isInvoice ? (
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="radio"
                      name="defaultInvoice"
                      checked={address.isDefaultInvoice}
                      onChange={() => setDefault(index, "isDefaultInvoice")}
                    />
                    Varsayılan fatura
                  </label>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                <AdminSwitch
                  className="w-full"
                  label="Kurumsal fatura"
                  description={
                    address.isCorporateInvoice
                      ? "Fatura şirket bilgileriyle kesilir."
                      : "Kapalıysa fatura ad ve soyad üzerine kesilir."
                  }
                  checked={address.isCorporateInvoice}
                  onChange={(checked) =>
                    onChange(
                      patchAt(addresses, index, {
                        isCorporateInvoice: checked,
                        isInvoice: checked ? true : address.isInvoice,
                        ...(checked ? {} : { company: "", taxOffice: "", taxNumber: "" }),
                      }),
                    )
                  }
                />
                {address.isCorporateInvoice ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Şirket ünvanı *</label>
                      <input
                        value={address.company}
                        onChange={(event) =>
                          onChange(patchAt(addresses, index, { company: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Vergi dairesi *</label>
                      <input
                        value={address.taxOffice}
                        onChange={(event) =>
                          onChange(patchAt(addresses, index, { taxOffice: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Vergi numarası *</label>
                      <input
                        value={address.taxNumber}
                        onChange={(event) =>
                          onChange(patchAt(addresses, index, { taxNumber: event.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
