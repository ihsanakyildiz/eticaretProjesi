"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { TURKEY_COUNTRY } from "@/data/countries";
import {
  countrySelectOptions,
  findListedName,
  isTurkeyCountry,
  loadTurkeyLocationTree,
  resolveCountryName,
  type TurkeyLocationTree,
} from "@/lib/address-locations";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

export type AddressLocationValues = {
  country: string;
  city: string;
  district: string;
  neighborhood: string;
  postalCode: string;
};

type Props = {
  value: AddressLocationValues;
  onChange: (patch: Partial<AddressLocationValues>) => void;
};

const countryOptions = countrySelectOptions();

export function AddressLocationFields({ value, onChange }: Props) {
  const turkeySelected = isTurkeyCountry(value.country);
  const [tree, setTree] = useState<TurkeyLocationTree | null>(null);
  const [loadError, setLoadError] = useState(false);
  const normalizedRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!turkeySelected) {
      normalizedRef.current = false;
      return;
    }

    let cancelled = false;
    loadTurkeyLocationTree()
      .then((data) => {
        if (!cancelled) {
          setTree(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [turkeySelected]);

  useEffect(() => {
    if (!tree || !turkeySelected || normalizedRef.current) return;
    normalizedRef.current = true;

    const current = valueRef.current;
    const nextCity = findListedName(Object.keys(tree), current.city);
    const districts = nextCity ? Object.keys(tree[nextCity] ?? {}) : [];
    const nextDistrict = findListedName(districts, current.district);
    const neighborhoods =
      nextCity && nextDistrict ? (tree[nextCity]?.[nextDistrict] ?? []) : [];
    const nextNeighborhood = findListedName(neighborhoods, current.neighborhood);

    if (
      nextCity !== current.city ||
      nextDistrict !== current.district ||
      nextNeighborhood !== current.neighborhood ||
      current.country !== TURKEY_COUNTRY
    ) {
      onChangeRef.current({
        country: TURKEY_COUNTRY,
        city: nextCity,
        district: nextDistrict,
        neighborhood: nextNeighborhood,
      });
    }
  }, [tree, turkeySelected]);

  const useSelects = turkeySelected && Boolean(tree) && !loadError;

  const provinceOptions = useMemo(() => {
    if (!tree) return [];
    return Object.keys(tree).map((name) => ({ id: name, label: name }));
  }, [tree]);

  const districtOptions = useMemo(() => {
    if (!tree || !value.city) return [];
    return Object.keys(tree[value.city] ?? {}).map((name) => ({ id: name, label: name }));
  }, [tree, value.city]);

  const neighborhoodOptions = useMemo(() => {
    if (!tree || !value.city || !value.district) return [];
    return (tree[value.city]?.[value.district] ?? []).map((name) => ({ id: name, label: name }));
  }, [tree, value.city, value.district]);

  const setCountry = (next: string) => {
    const country = resolveCountryName(next) || TURKEY_COUNTRY;
    normalizedRef.current = false;
    if (isTurkeyCountry(country) && !isTurkeyCountry(value.country)) {
      onChange({ country: TURKEY_COUNTRY });
      return;
    }
    onChange({ country });
  };

  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Ülke *</label>
        <SearchableSelect
          value={resolveCountryName(value.country)}
          onChange={setCountry}
          options={countryOptions}
          placeholder="Ülke seçin"
          emptyLabel="Ülke seçin"
          searchPlaceholder="Ülke ara…"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Posta kodu</label>
        <input
          value={value.postalCode}
          onChange={(event) => onChange({ postalCode: event.target.value })}
          className={inputClass}
        />
      </div>

      {useSelects ? (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">İl *</label>
            <SearchableSelect
              value={value.city}
              onChange={(city) => onChange({ city, district: "", neighborhood: "" })}
              options={provinceOptions}
              placeholder="İl seçin"
              emptyLabel="İl seçin"
              searchPlaceholder="İl ara…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">İlçe *</label>
            <SearchableSelect
              value={value.district}
              onChange={(district) => onChange({ district, neighborhood: "" })}
              options={districtOptions}
              placeholder={value.city ? "İlçe seçin" : "Önce il seçin"}
              emptyLabel={value.city ? "İlçe seçin" : "Önce il seçin"}
              searchPlaceholder="İlçe ara…"
              disabled={!value.city}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Mahalle *</label>
            <SearchableSelect
              value={value.neighborhood}
              onChange={(neighborhood) => onChange({ neighborhood })}
              options={neighborhoodOptions}
              placeholder={value.district ? "Mahalle seçin" : "Önce ilçe seçin"}
              emptyLabel={value.district ? "Mahalle seçin" : "Önce ilçe seçin"}
              searchPlaceholder="Mahalle ara…"
              disabled={!value.district}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {turkeySelected ? "İl *" : "Şehir *"}
            </label>
            <input
              value={value.city}
              onChange={(event) => onChange({ city: event.target.value })}
              className={inputClass}
              placeholder={turkeySelected && !tree && !loadError ? "İller yükleniyor…" : undefined}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {turkeySelected ? "İlçe *" : "İlçe / Bölge"}
            </label>
            <input
              value={value.district}
              onChange={(event) => onChange({ district: event.target.value })}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {turkeySelected ? "Mahalle *" : "Mahalle / Semt"}
            </label>
            <input
              value={value.neighborhood}
              onChange={(event) => onChange({ neighborhood: event.target.value })}
              className={inputClass}
            />
          </div>
        </>
      )}
    </>
  );
}
