import { COUNTRIES, TURKEY_COUNTRY } from "@/data/countries";

export type TurkeyLocationTree = Record<string, Record<string, string[]>>;

let turkeyTreePromise: Promise<TurkeyLocationTree> | null = null;

export function isTurkeyCountry(country: string): boolean {
  const normalized = country.trim().toLocaleLowerCase("tr-TR");
  return normalized === "türkiye" || normalized === "turkiye" || normalized === "turkey";
}

export function resolveCountryName(country: string): string {
  const trimmed = country.trim();
  if (!trimmed) return TURKEY_COUNTRY;
  if (isTurkeyCountry(trimmed)) return TURKEY_COUNTRY;
  const match = COUNTRIES.find(
    (item) => item.toLocaleLowerCase("tr-TR") === trimmed.toLocaleLowerCase("tr-TR"),
  );
  return match ?? trimmed;
}

export function findListedName(list: string[], value: string): string {
  const needle = value.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return "";
  return list.find((item) => item.toLocaleLowerCase("tr-TR") === needle) ?? "";
}

export function loadTurkeyLocationTree(): Promise<TurkeyLocationTree> {
  turkeyTreePromise ??= import("@/data/turkey-locations.json").then((mod) => {
    const data = "default" in mod ? mod.default : mod;
    return data as TurkeyLocationTree;
  });
  return turkeyTreePromise;
}

export function countrySelectOptions() {
  return COUNTRIES.map((name) => ({ id: name, label: name }));
}
