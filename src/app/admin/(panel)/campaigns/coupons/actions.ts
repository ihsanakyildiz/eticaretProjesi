"use server";

import { revalidatePath } from "next/cache";
import {
  isDiscountCouponKind,
  isDiscountCouponStatus,
  isDiscountCouponUsage,
  parseDiscountCouponMinSubtotal,
  parseDiscountCouponValue,
  parseDiscountCouponWindow,
} from "@/lib/discount-coupon-kinds";
import {
  createDiscountCoupon,
  disableDiscountCoupon,
  searchDiscountCouponCustomers,
  searchDiscountCouponProducts,
  updateDiscountCoupon,
} from "@/lib/discount-coupons";
import { loadDiscountCouponStatsDetail } from "@/lib/discount-coupon-stats";
import { requirePermission } from "@/lib/staff-permissions";

function revalidateCoupons(id?: string) {
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin/campaigns/coupons");
  if (id) {
    revalidatePath(`/admin/campaigns/coupons/${id}/edit`);
  }
}

function readStringList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function parseCouponWrite(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "");
  if (!isDiscountCouponKind(kindRaw)) {
    return { error: "İndirim türünü seçin." };
  }

  const usageRaw = String(formData.get("usageMode") ?? "");
  if (!isDiscountCouponUsage(usageRaw)) {
    return { error: "Kullanım modunu seçin." };
  }

  const statusRaw = String(formData.get("status") ?? "ACTIVE");
  if (!isDiscountCouponStatus(statusRaw)) {
    return { error: "Durum geçersiz." };
  }

  const value = parseDiscountCouponValue(kindRaw, String(formData.get("value") ?? ""));
  if (!value.ok) return { error: value.error };

  const window = parseDiscountCouponWindow({
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  });
  if (!window.ok) return { error: window.error };

  const minSubtotal = parseDiscountCouponMinSubtotal(
    String(formData.get("minSubtotal") ?? ""),
  );
  if (!minSubtotal.ok) return { error: minSubtotal.error };

  const customerId = String(formData.get("customerId") ?? "").trim() || null;

  return {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    kind: kindRaw,
    valueInt: value.valueInt,
    usageMode: usageRaw,
    status: statusRaw,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    minSubtotalMinor: minSubtotal.minSubtotalMinor,
    customerId,
    categoryIds: readStringList(formData, "categoryIds"),
    brandIds: readStringList(formData, "brandIds"),
    productIds: readStringList(formData, "productIds"),
  };
}

export async function searchCouponProductsAction(query: string) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error, products: [] };
  const products = await searchDiscountCouponProducts(query);
  return { products };
}

export async function searchCouponCustomersAction(query: string) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error, customers: [] };
  const customers = await searchDiscountCouponCustomers(query);
  return { customers };
}

export async function createCouponAction(formData: FormData) {
  const gate = await requirePermission("campaigns", "create");
  if (!gate.ok) return { error: gate.error };

  const parsed = parseCouponWrite(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = await createDiscountCoupon(parsed);
  if ("error" in result) return { error: result.error };
  revalidateCoupons(result.id);
  return { id: result.id };
}

export async function updateCouponAction(formData: FormData) {
  const gate = await requirePermission("campaigns", "update");
  if (!gate.ok) return { error: gate.error };

  const couponId = String(formData.get("couponId") ?? "").trim();
  if (!couponId) return { error: "Hediye çeki bulunamadı." };

  const parsed = parseCouponWrite(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = await updateDiscountCoupon(couponId, parsed);
  if ("error" in result) return { error: result.error };
  revalidateCoupons(result.id);
  return { id: result.id };
}

export async function disableCouponAction(couponId: string) {
  const gate = await requirePermission("campaigns", "update");
  if (!gate.ok) return { error: gate.error };
  const id = String(couponId ?? "").trim();
  if (!id) return { error: "Hediye çeki bulunamadı." };
  const result = await disableDiscountCoupon(id);
  if ("error" in result) return { error: result.error };
  revalidateCoupons(id);
  return { id };
}

export async function loadCouponStatsAction(couponId: string) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error };
  const id = String(couponId ?? "").trim();
  if (!id) return { error: "Hediye çeki bulunamadı." };
  const stats = await loadDiscountCouponStatsDetail(id);
  if (!stats) return { error: "Hediye çeki bulunamadı." };
  return { stats };
}
