export const CUSTOMER_TITLES = ["MR", "MRS"] as const;
export type CustomerTitleCode = (typeof CUSTOMER_TITLES)[number];

export const CUSTOMER_GROUPS = ["CUSTOMER", "GUEST", "WHOLESALE"] as const;
export type CustomerGroupCode = (typeof CUSTOMER_GROUPS)[number];

export const CUSTOMER_SOURCES = ["STORE", "OAUTH", "ADMIN", "SUPPORT_CHAT"] as const;
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];

export const CUSTOMER_FLAG_FIELDS = ["isActive", "newsletter", "partnerOffers"] as const;
export type CustomerFlagField = (typeof CUSTOMER_FLAG_FIELDS)[number];

export const CUSTOMER_BULK_ACTIONS = [
  "enable",
  "disable",
  "newsletterOn",
  "newsletterOff",
  "delete",
] as const;
export type CustomerBulkAction = (typeof CUSTOMER_BULK_ACTIONS)[number];

export type AddressDraft = {
  id?: string;
  alias: string;
  firstName: string;
  lastName: string;
  company: string;
  taxOffice: string;
  taxNumber: string;
  phone: string;
  line1: string;
  line2: string;
  district: string;
  city: string;
  neighborhood: string;
  postalCode: string;
  country: string;
  isDelivery: boolean;
  isInvoice: boolean;
  isDefaultDelivery: boolean;
  isDefaultInvoice: boolean;
  isCorporateInvoice: boolean;
};

export function splitFullName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function joinFullName(firstName: string, lastName: string): string | null {
  const combined = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  return combined || null;
}

export function customerTitleLabel(title: CustomerTitleCode): string {
  switch (title) {
    case "MR":
      return "Bay";
    case "MRS":
      return "Bayan";
    default: {
      const _exhaustive: never = title;
      return _exhaustive;
    }
  }
}

export function customerGroupLabel(group: CustomerGroupCode): string {
  switch (group) {
    case "CUSTOMER":
      return "Müşteri";
    case "GUEST":
      return "Ziyaretçi";
    case "WHOLESALE":
      return "Toptancı";
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export function parseCustomerTitle(value: string): CustomerTitleCode {
  switch (value) {
    case "MR":
    case "MRS":
      return value;
    default:
      return "MR";
  }
}

export function parseCustomerGroup(value: string): CustomerGroupCode {
  switch (value) {
    case "CUSTOMER":
    case "GUEST":
    case "WHOLESALE":
      return value;
    default:
      return "CUSTOMER";
  }
}

export function customerSourceLabel(source: CustomerSource): string {
  switch (source) {
    case "STORE":
      return "Mağaza";
    case "OAUTH":
      return "Sosyal giriş";
    case "ADMIN":
      return "Yönetici";
    case "SUPPORT_CHAT":
      return "Destek sohbeti";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function parseCustomerSource(value: string | null | undefined): CustomerSource {
  switch (value) {
    case "STORE":
    case "OAUTH":
    case "ADMIN":
    case "SUPPORT_CHAT":
      return value;
    default:
      return "STORE";
  }
}

export function isSyntheticCustomerEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@sohbet.local");
}

export function customerEmailLabel(email: string): string {
  return isSyntheticCustomerEmail(email) ? "—" : email;
}

export function emptyAddressDraft(partial?: Partial<AddressDraft>): AddressDraft {
  return {
    alias: "",
    firstName: "",
    lastName: "",
    company: "",
    taxOffice: "",
    taxNumber: "",
    phone: "",
    line1: "",
    line2: "",
    district: "",
    city: "",
    neighborhood: "",
    postalCode: "",
    country: "Türkiye",
    isDelivery: true,
    isInvoice: true,
    isDefaultDelivery: false,
    isDefaultInvoice: false,
    isCorporateInvoice: false,
    ...partial,
  };
}

export function isBlankAddress(draft: AddressDraft): boolean {
  return ![
    draft.alias,
    draft.firstName,
    draft.lastName,
    draft.company,
    draft.taxOffice,
    draft.taxNumber,
    draft.phone,
    draft.line1,
    draft.line2,
    draft.district,
    draft.city,
    draft.neighborhood,
    draft.postalCode,
  ].some((value) => value.trim());
}

export function normalizeAddressDefaults(addresses: AddressDraft[]): AddressDraft[] {
  const withTypes = addresses.map((address) => ({
    ...address,
    isDelivery: address.isDelivery || address.isDefaultDelivery,
    isInvoice: address.isInvoice || address.isDefaultInvoice || address.isCorporateInvoice,
  }));

  let defaultDeliveryIndex = withTypes.findIndex(
    (address) => address.isDefaultDelivery && address.isDelivery,
  );
  if (defaultDeliveryIndex < 0) {
    defaultDeliveryIndex = withTypes.findIndex((address) => address.isDelivery);
  }

  let defaultInvoiceIndex = withTypes.findIndex(
    (address) => address.isDefaultInvoice && address.isInvoice,
  );
  if (defaultInvoiceIndex < 0) {
    defaultInvoiceIndex = withTypes.findIndex((address) => address.isInvoice);
  }

  return withTypes.map((address, index) => ({
    ...address,
    isDefaultDelivery: address.isDelivery && index === defaultDeliveryIndex,
    isDefaultInvoice: address.isInvoice && index === defaultInvoiceIndex,
  }));
}

function readString(value: unknown, max = 255): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
}

export function parseAddressDrafts(raw: string): AddressDraft[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return emptyAddressDraft({
        id: readString(record.id, 64) || undefined,
        alias: readString(record.alias, 100),
        firstName: readString(record.firstName, 100),
        lastName: readString(record.lastName, 100),
        company: readString(record.company, 191),
        taxOffice: readString(record.taxOffice, 100),
        taxNumber: readString(record.taxNumber, 50),
        phone: readString(record.phone, 50),
        line1: readString(record.line1, 255),
        line2: readString(record.line2, 255),
        district: readString(record.district, 100),
        city: readString(record.city, 100),
        neighborhood: readString(record.neighborhood, 150),
        postalCode: readString(record.postalCode, 20),
        country: readString(record.country, 100) || "Türkiye",
        isDelivery: readBoolean(record.isDelivery),
        isInvoice: readBoolean(record.isInvoice),
        isDefaultDelivery: readBoolean(record.isDefaultDelivery),
        isDefaultInvoice: readBoolean(record.isDefaultInvoice),
        isCorporateInvoice: readBoolean(record.isCorporateInvoice),
      });
    });
  } catch {
    return [];
  }
}

export function formatCustomerDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function dateOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
