import type { Prisma } from "@prisma/client";
import { isTurkeyCountry } from "@/lib/address-locations";
import {
  isBlankAddress,
  normalizeAddressDefaults,
  parseAddressDrafts,
  type AddressDraft,
} from "@/lib/customers";

export function prepareAddressDrafts(raw: string): { addresses: AddressDraft[]; error?: string } {
  const filled = parseAddressDrafts(raw).filter((draft) => !isBlankAddress(draft));
  for (const draft of filled) {
    if (!draft.firstName || !draft.lastName) {
      return { addresses: [], error: "Her adreste ad ve soyad zorunludur." };
    }
    if (!draft.line1) {
      return { addresses: [], error: "Her adreste açık adres zorunludur." };
    }
    if (!draft.city) {
      return {
        addresses: [],
        error: isTurkeyCountry(draft.country)
          ? "Türkiye adreslerinde il zorunludur."
          : "Her adreste şehir zorunludur.",
      };
    }
    if (isTurkeyCountry(draft.country) && (!draft.district || !draft.neighborhood)) {
      return { addresses: [], error: "Türkiye adreslerinde ilçe ve mahalle zorunludur." };
    }
    if (!draft.isDelivery && !draft.isInvoice) {
      return {
        addresses: [],
        error: "Her adres teslimat, fatura veya her ikisi için işaretlenmelidir.",
      };
    }
    if (draft.isCorporateInvoice) {
      if (!draft.company || !draft.taxOffice || !draft.taxNumber) {
        return {
          addresses: [],
          error: "Kurumsal faturada şirket ünvanı, vergi dairesi ve vergi numarası zorunludur.",
        };
      }
    }
  }
  return { addresses: normalizeAddressDefaults(filled) };
}

export async function nextCustomerNo(tx: Prisma.TransactionClient) {
  const last = await tx.user.aggregate({ _max: { customerNo: true } });
  return (last._max.customerNo ?? 0) + 1;
}

export function customerAddressToDraft(row: {
  id: string;
  alias: string;
  firstName: string;
  lastName: string;
  company: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  district: string | null;
  city: string;
  neighborhood: string | null;
  postalCode: string | null;
  country: string;
  isDelivery: boolean;
  isInvoice: boolean;
  isDefaultDelivery: boolean;
  isDefaultInvoice: boolean;
  isCorporateInvoice: boolean;
}): AddressDraft {
  return {
    id: row.id,
    alias: row.alias,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company ?? "",
    taxOffice: row.taxOffice ?? "",
    taxNumber: row.taxNumber ?? "",
    phone: row.phone ?? "",
    line1: row.line1,
    line2: row.line2 ?? "",
    district: row.district ?? "",
    city: row.city,
    neighborhood: row.neighborhood ?? "",
    postalCode: row.postalCode ?? "",
    country: row.country,
    isDelivery: row.isDelivery,
    isInvoice: row.isInvoice,
    isDefaultDelivery: row.isDefaultDelivery,
    isDefaultInvoice: row.isDefaultInvoice,
    isCorporateInvoice: row.isCorporateInvoice,
  };
}

export async function appendCustomerAddress(
  tx: Prisma.TransactionClient,
  userId: string,
  draft: AddressDraft,
) {
  const existing = await tx.customerAddress.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const drafts = normalizeAddressDefaults([
    ...existing.map(customerAddressToDraft),
    draft,
  ]);
  await replaceCustomerAddresses(tx, userId, drafts);
}

export async function replaceCustomerAddresses(
  tx: Prisma.TransactionClient,
  userId: string,
  drafts: AddressDraft[],
) {
  await tx.customerAddress.deleteMany({ where: { userId } });
  if (drafts.length === 0) return;

  await tx.customerAddress.createMany({
    data: drafts.map((draft, index) => ({
      userId,
      alias: draft.alias || (draft.isInvoice && !draft.isDelivery ? "Fatura" : "Teslimat"),
      firstName: draft.firstName,
      lastName: draft.lastName,
      company: draft.isCorporateInvoice ? draft.company || null : null,
      taxOffice: draft.isCorporateInvoice ? draft.taxOffice || null : null,
      taxNumber: draft.isCorporateInvoice ? draft.taxNumber || null : null,
      phone: draft.phone || null,
      line1: draft.line1,
      line2: draft.line2 || null,
      district: draft.district || null,
      city: draft.city,
      neighborhood: draft.neighborhood || null,
      postalCode: draft.postalCode || null,
      country: draft.country || "Türkiye",
      isDelivery: draft.isDelivery,
      isInvoice: draft.isInvoice,
      isDefaultDelivery: draft.isDefaultDelivery,
      isDefaultInvoice: draft.isDefaultInvoice,
      isCorporateInvoice: draft.isCorporateInvoice,
      sortOrder: index,
    })),
  });
}
