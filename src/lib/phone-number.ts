import {
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_COUNTRY_CODES,
} from "@/data/phone-country-codes";

const codesLongestFirst = [...new Set(PHONE_COUNTRY_CODES.map((item) => item.code))].sort(
  (left, right) => right.length - left.length,
);

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function phoneLookupNeedles(raw: string): string[] {
  const digits = digitsOnly(raw);
  if (digits.length < 7) return [];
  const needles = new Set<string>([digits]);
  if (digits.startsWith("90") && digits.length >= 12) needles.add(digits.slice(2));
  if (digits.startsWith("0")) needles.add(digits.slice(1));
  if (digits.length >= 10) needles.add(digits.slice(-10));
  return [...needles];
}

export function composeStoredPhone(raw: string): string | null {
  const digits = digitsOnly(raw);
  if (digits.length < 7) return null;
  if (digits.startsWith("90") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return `+${digits}`;
}

export function composePhone(code: string, national: string): string {
  const number = digitsOnly(national);
  if (!number) return "";
  return `${code}${number}`;
}

export function parsePhone(raw: string | null | undefined): { code: string; national: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { code: DEFAULT_PHONE_COUNTRY_CODE, national: "" };

  const compact = trimmed.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    const rest = compact.slice(1);
    const code = codesLongestFirst.find((item) => rest.startsWith(item.slice(1)));
    if (code) {
      return { code, national: rest.slice(code.length - 1) };
    }
  }

  const national = digitsOnly(trimmed).replace(/^0/, "");
  return { code: DEFAULT_PHONE_COUNTRY_CODE, national };
}

export function uniquePhoneCountryCodes() {
  const countriesByCode = new Map<string, string[]>();
  for (const item of PHONE_COUNTRY_CODES) {
    const current = countriesByCode.get(item.code) ?? [];
    current.push(item.country);
    countriesByCode.set(item.code, current);
  }

  return Array.from(countriesByCode.entries()).map(([code, countries]) => ({
    code,
    country: countries[0] ?? "",
    searchText: `${code} ${countries.join(" ")}`,
  }));
}
