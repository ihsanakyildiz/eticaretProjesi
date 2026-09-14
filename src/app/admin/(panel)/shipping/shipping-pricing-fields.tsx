"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { loadTurkeyLocationTree } from "@/lib/address-locations";
import {
  DEFAULT_SHIPPING_RATE_SETTINGS,
  rateSettingsToFormValues,
  type ShippingCityOverrideMode,
  type ShippingPricingModeCode,
} from "@/lib/shipping-carrier-pricing";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

type DesiTierRow = { maxDesi: string; priceMajor: string };
type CityOverrideRow = {
  cities: string[];
  mode: ShippingCityOverrideMode;
  flatMajor: string;
  multiplier: string;
  cityPick: string;
};

export type ShippingPricingFormInitial = {
  pricingMode?: ShippingPricingModeCode;
  flatPriceMajor?: string;
  freeShippingEnabled?: boolean;
  freeShippingMinSubtotalMajor?: string;
  rateForm?: ReturnType<typeof rateSettingsToFormValues>;
};

function emptyCityRow(): CityOverrideRow {
  return {
    cities: [],
    mode: "FLAT",
    flatMajor: "0",
    multiplier: "1.2",
    cityPick: "",
  };
}

export function ShippingPricingFields({
  initial,
  fieldErrors,
}: {
  initial?: ShippingPricingFormInitial;
  fieldErrors?: Record<string, string>;
}) {
  const defaults = rateSettingsToFormValues(DEFAULT_SHIPPING_RATE_SETTINGS);
  const rateForm = initial?.rateForm ?? defaults;

  const [pricingMode, setPricingMode] = useState<ShippingPricingModeCode>(
    initial?.pricingMode ?? "FLAT",
  );
  const [flatPriceMajor, setFlatPriceMajor] = useState(initial?.flatPriceMajor ?? "0");
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    initial?.freeShippingEnabled ?? false,
  );
  const [freeMinMajor, setFreeMinMajor] = useState(
    initial?.freeShippingMinSubtotalMajor ?? "",
  );
  const [desiTiers, setDesiTiers] = useState<DesiTierRow[]>(
    rateForm.desiTiers.length > 0
      ? rateForm.desiTiers
      : [{ maxDesi: "1", priceMajor: "99" }],
  );
  const [overagePerDesiMajor, setOveragePerDesiMajor] = useState(rateForm.overagePerDesiMajor);
  const [defaultDesiWhenMissing, setDefaultDesiWhenMissing] = useState(
    rateForm.defaultDesiWhenMissing,
  );
  const [cityOverrides, setCityOverrides] = useState<CityOverrideRow[]>(
    rateForm.cityOverrides.length > 0
      ? rateForm.cityOverrides.map((row) => ({ ...row, cityPick: "" }))
      : [],
  );
  const [provinces, setProvinces] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadTurkeyLocationTree()
      .then((tree) => {
        if (!cancelled) setProvinces(Object.keys(tree).sort((a, b) => a.localeCompare(b, "tr")));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const provinceOptions = useMemo(
    () => provinces.map((name) => ({ id: name, label: name })),
    [provinces],
  );

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="border-b border-[#e9ebec] px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Ücretlendirme</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sabit tutar veya desi/ağırlık dilimleri. İsteğe bağlı şehir farkı ve bedava kargo.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Hesaplama modeli</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { id: "FLAT" as const, label: "Sabit tutar", hint: "Tüm siparişlerde aynı ücret" },
                {
                  id: "DESI" as const,
                  label: "Desi / ağırlık",
                  hint: "Paket desisine göre dilim tablosu",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
                  pricingMode === option.id
                    ? "border-[#0ab39c] bg-[#0ab39c]/5"
                    : "border-[#e9ebec]"
                }`}
              >
                <input
                  type="radio"
                  name="pricingMode"
                  className="mt-0.5"
                  checked={pricingMode === option.id}
                  onChange={() => setPricingMode(option.id)}
                  value={option.id}
                />
                <span>
                  <span className="font-medium text-slate-800">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {pricingMode === "FLAT" ? (
          <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Kargo ücreti (TL)
            </span>
            <input
              name="flatPriceMajor"
              value={flatPriceMajor}
              onChange={(event) => setFlatPriceMajor(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={inputClass}
            />
            {fieldErrors?.flatPriceMajor ? (
              <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.flatPriceMajor}</p>
            ) : null}
          </label>
        ) : (
          <>
            <input type="hidden" name="flatPriceMajor" value={flatPriceMajor || "0"} />
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Desi dilimleri</p>
                <button
                  type="button"
                  onClick={() =>
                    setDesiTiers((rows) => [...rows, { maxDesi: "", priceMajor: "" }])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Dilim ekle
                </button>
              </div>
              <div className="space-y-2">
                {desiTiers.map((tier, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      name="desiTierMax"
                      value={tier.maxDesi}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDesiTiers((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, maxDesi: value } : row,
                          ),
                        );
                      }}
                      placeholder="Max desi"
                      inputMode="decimal"
                      className={inputClass}
                    />
                    <input
                      name="desiTierPriceMajor"
                      value={tier.priceMajor}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDesiTiers((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, priceMajor: value } : row,
                          ),
                        );
                      }}
                      placeholder="Ücret (TL)"
                      inputMode="decimal"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDesiTiers((rows) =>
                          rows.length <= 1 ? rows : rows.filter((_, i) => i !== index),
                        )
                      }
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 text-rose-600"
                      aria-label="Dilim sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Son dilim sonrası desi ücreti (TL)
                </span>
                <input
                  name="overagePerDesiMajor"
                  value={overagePerDesiMajor}
                  onChange={(event) => setOveragePerDesiMajor(event.target.value)}
                  inputMode="decimal"
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ölçü yoksa varsayılan desi
                </span>
                <input
                  name="defaultDesiWhenMissing"
                  value={defaultDesiWhenMissing}
                  onChange={(event) => setDefaultDesiWhenMissing(event.target.value)}
                  inputMode="decimal"
                  className={inputClass}
                />
              </label>
            </div>
          </>
        )}

        {pricingMode === "FLAT" ? (
          <>
            <input type="hidden" name="overagePerDesiMajor" value={overagePerDesiMajor} />
            <input
              type="hidden"
              name="defaultDesiWhenMissing"
              value={defaultDesiWhenMissing}
            />
            {desiTiers.map((tier, index) => (
              <span key={index} className="hidden">
                <input type="hidden" name="desiTierMax" value={tier.maxDesi} />
                <input type="hidden" name="desiTierPriceMajor" value={tier.priceMajor} />
              </span>
            ))}
          </>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Şehir farkları</p>
              <p className="text-xs text-slate-500">
                Seçilen illerde sabit tutar veya çarpan uygulanır.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCityOverrides((rows) => [...rows, emptyCityRow()])}
              className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Şehir kuralı
            </button>
          </div>
          <input type="hidden" name="cityOverrideCount" value={cityOverrides.length} />
          <div className="space-y-3">
            {cityOverrides.map((row, index) => {
              const available = provinceOptions.filter(
                (option) => !row.cities.includes(option.id),
              );
              return (
                <div
                  key={index}
                  className="rounded-md border border-[#e9ebec] bg-[#f8fafc] p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">Kural #{index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setCityOverrides((rows) => rows.filter((_, i) => i !== index))
                      }
                      className="text-rose-600"
                      aria-label="Kuralı sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="hidden"
                    name={`cityOverrideCities_${index}`}
                    value={row.cities.join("|")}
                  />
                  <SearchableSelect
                    value={row.cityPick}
                    onChange={(cityId) => {
                      if (!cityId) return;
                      setCityOverrides((rows) =>
                        rows.map((current, i) =>
                          i === index
                            ? {
                                ...current,
                                cities: current.cities.includes(cityId)
                                  ? current.cities
                                  : [...current.cities, cityId],
                                cityPick: "",
                              }
                            : current,
                        ),
                      );
                    }}
                    options={available}
                    placeholder="İl ekle…"
                    emptyLabel="İl seçin"
                  />
                  <div className="flex flex-wrap gap-2">
                    {row.cities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 border border-[#e9ebec]"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() =>
                            setCityOverrides((rows) =>
                              rows.map((current, i) =>
                                i === index
                                  ? {
                                      ...current,
                                      cities: current.cities.filter((name) => name !== city),
                                    }
                                  : current,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-medium text-slate-500">Tür</span>
                      <select
                        name={`cityOverrideMode_${index}`}
                        value={row.mode}
                        onChange={(event) => {
                          const mode =
                            event.target.value === "MULTIPLIER" ? "MULTIPLIER" : "FLAT";
                          setCityOverrides((rows) =>
                            rows.map((current, i) =>
                              i === index ? { ...current, mode } : current,
                            ),
                          );
                        }}
                        className={inputClass}
                      >
                        <option value="FLAT">Sabit tutar (TL)</option>
                        <option value="MULTIPLIER">Çarpan</option>
                      </select>
                    </label>
                    {row.mode === "FLAT" ? (
                      <label>
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          Tutar (TL)
                        </span>
                        <input
                          name={`cityOverrideFlatMajor_${index}`}
                          value={row.flatMajor}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCityOverrides((rows) =>
                              rows.map((current, i) =>
                                i === index ? { ...current, flatMajor: value } : current,
                              ),
                            );
                          }}
                          inputMode="decimal"
                          className={inputClass}
                        />
                        <input
                          type="hidden"
                          name={`cityOverrideMultiplier_${index}`}
                          value={row.multiplier}
                        />
                      </label>
                    ) : (
                      <label>
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          Çarpan
                        </span>
                        <input
                          name={`cityOverrideMultiplier_${index}`}
                          value={row.multiplier}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCityOverrides((rows) =>
                              rows.map((current, i) =>
                                i === index ? { ...current, multiplier: value } : current,
                              ),
                            );
                          }}
                          inputMode="decimal"
                          className={inputClass}
                        />
                        <input
                          type="hidden"
                          name={`cityOverrideFlatMajor_${index}`}
                          value={row.flatMajor}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-[#e9ebec] p-4 space-y-3">
          <AdminSwitch
            name="freeShippingEnabled"
            label="Bedava kargo sun"
            description="İşaretlenirse koşullar sağlandığında bu firma 0 TL görünür"
            checked={freeShippingEnabled}
            onChange={setFreeShippingEnabled}
          />
          {freeShippingEnabled ? (
            <label>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Minimum sepet tutarı (TL, boş = her zaman bedava)
              </span>
              <input
                name="freeShippingMinSubtotalMajor"
                value={freeMinMajor}
                onChange={(event) => setFreeMinMajor(event.target.value)}
                inputMode="decimal"
                placeholder="Örn. 1500"
                className={inputClass}
              />
              {fieldErrors?.freeShippingMinSubtotalMajor ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.freeShippingMinSubtotalMajor}
                </p>
              ) : null}
            </label>
          ) : (
            <input type="hidden" name="freeShippingMinSubtotalMajor" value={freeMinMajor} />
          )}
        </div>

        {fieldErrors?.rateSettings ? (
          <p className="text-sm text-rose-600">{fieldErrors.rateSettings}</p>
        ) : null}
      </div>
    </section>
  );
}
