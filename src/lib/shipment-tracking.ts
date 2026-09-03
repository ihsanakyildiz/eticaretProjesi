import "server-only";

import { OrderAddressKind, ShippingCarrierProvider } from "@prisma/client";
import { shippingCarrierProviderById } from "@/config/shipping-carriers";
import { parseOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  arasCancelDispatch,
  arasCreateAccepted,
  arasCredentialsReady,
  arasPhoneDigits,
  arasQueryTracking,
  arasSetOrder,
  parseArasApiSettings,
  type ArasTrackingView,
} from "@/lib/aras-kargo";
import {
  parseYurticiApiSettings,
  yurticiCancelShipment,
  yurticiCreateAccepted,
  yurticiCreateShipment,
  yurticiCredentialsReady,
  yurticiPhoneDigits,
  yurticiQueryTracking,
  yurticiResultField,
  type YurticiTrackingView,
} from "@/lib/yurtici-kargo";

const TRACKING_CACHE_MS = 60_000;

type TimelineView = YurticiTrackingView | ArasTrackingView;

const trackingCache = new Map<string, { at: number; value: TimelineView }>();

export type MemberShipmentTracking =
  | {
      kind: "timeline";
      provider: "YURTICI" | "ARAS";
      carrierName: string;
      cargoKey: string;
      publicUrl: string | null;
      tracking: TimelineView;
    }
  | {
      kind: "link";
      carrierName: string;
      cargoKey: string;
      publicUrl: string;
    };

function normalizeCarrierName(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function looksLikeYurticiName(name: string) {
  return normalizeCarrierName(name).includes("yurtici");
}

export function looksLikeArasName(name: string) {
  return normalizeCarrierName(name).includes("aras");
}

export function usesIntegratedCarrierApi(name: string) {
  return looksLikeYurticiName(name) || looksLikeArasName(name);
}

export function yurticiReceiverFromAddress(address: {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  district: string | null;
  city: string;
  phone: string | null;
}) {
  const customerName = `${address.firstName} ${address.lastName}`.replace(/\s+/g, " ").trim();
  const street = [address.line1, address.line2, address.neighborhood]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return {
    customerName,
    address: street,
    city: address.city.trim(),
    town: (address.district || address.neighborhood || "").trim(),
    phone: address.phone,
  };
}

function trackingUrlFromTemplate(template: string | null | undefined, cargoKey: string) {
  if (!template?.includes("{tracking}")) return null;
  return template.replaceAll("{tracking}", encodeURIComponent(cargoKey));
}

export async function loadYurticiCarrier() {
  const carrier = await prisma.shippingCarrier.findFirst({
    where: { provider: ShippingCarrierProvider.YURTICI, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, trackingUrlTemplate: true, apiSettings: true },
  });
  if (!carrier) return null;
  const settings = parseYurticiApiSettings(carrier.apiSettings);
  if (!yurticiCredentialsReady(settings) || !settings) return null;
  return { carrier, credentials: settings };
}

export async function loadArasCarrier() {
  const carrier = await prisma.shippingCarrier.findFirst({
    where: { provider: ShippingCarrierProvider.ARAS, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, trackingUrlTemplate: true, apiSettings: true },
  });
  if (!carrier) return null;
  const settings = parseArasApiSettings(carrier.apiSettings);
  if (!arasCredentialsReady(settings) || !settings) return null;
  return { carrier, credentials: settings };
}

export async function loadOrderShipmentTracking(order: {
  id?: string;
  status: string;
  carrierName: string | null;
  trackingNumber: string | null;
}): Promise<MemberShipmentTracking | null> {
  const status = parseOrderStatus(order.status);
  switch (status) {
    case "SHIPPED":
    case "DELIVERED":
      break;
    case "AWAITING_PAYMENT":
    case "PAYMENT_ACCEPTED":
    case "PROCESSING":
    case "CANCELED":
    case "PAYMENT_ERROR":
    case "REFUNDED":
      return null;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }

  const cargoKey = order.trackingNumber?.trim();
  if (!cargoKey) return null;
  const carrierName = order.carrierName?.trim() || "Kargo";

  if (looksLikeYurticiName(carrierName)) {
    return loadYurticiTimeline({
      orderId: order.id,
      status,
      carrierName,
      cargoKey,
    });
  }
  if (looksLikeArasName(carrierName)) {
    return loadArasTimeline({
      orderId: order.id,
      status,
      carrierName,
      cargoKey,
    });
  }

  const carriers = await prisma.shippingCarrier.findMany({
    where: { isActive: true },
    select: { name: true, trackingUrlTemplate: true, provider: true },
  });
  const match = carriers.find(
    (row) => row.name.trim().toLocaleLowerCase("tr-TR") === carrierName.toLocaleLowerCase("tr-TR"),
  );
  const url = trackingUrlFromTemplate(match?.trackingUrlTemplate, cargoKey);
  if (!url) return null;
  return { kind: "link", carrierName, cargoKey, publicUrl: url };
}

async function loadYurticiTimeline(input: {
  orderId?: string;
  status: ReturnType<typeof parseOrderStatus>;
  carrierName: string;
  cargoKey: string;
}): Promise<MemberShipmentTracking> {
  const yurtici = await loadYurticiCarrier();
  const fallbackUrl =
    trackingUrlFromTemplate(
      yurtici?.carrier.trackingUrlTemplate ??
        shippingCarrierProviderById("YURTICI").trackingUrlTemplate,
      input.cargoKey,
    ) ??
    `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(input.cargoKey)}`;

  if (!yurtici) {
    return { kind: "link", carrierName: input.carrierName, cargoKey: input.cargoKey, publicUrl: fallbackUrl };
  }

  const cacheKey = `yurtici:${yurtici.credentials.environment}:${input.cargoKey}`;
  const cached = trackingCache.get(cacheKey);
  const now = Date.now();
  let tracking =
    cached && now - cached.at < TRACKING_CACHE_MS
      ? cached.value
      : await yurticiQueryTracking(yurtici.credentials, input.cargoKey).catch(
          () => cached?.value ?? null,
        );

  if (tracking && (!cached || now - cached.at >= TRACKING_CACHE_MS)) {
    trackingCache.set(cacheKey, { at: now, value: tracking });
  }
  if (!tracking) {
    return { kind: "link", carrierName: input.carrierName, cargoKey: input.cargoKey, publicUrl: fallbackUrl };
  }

  if (tracking.pendingPickup && !tracking.found && input.orderId && input.status === "SHIPPED") {
    const ensured = await ensureYurticiShipmentForOrder(input.orderId);
    if (ensured.ok) {
      const refreshed = await yurticiQueryTracking(yurtici.credentials, input.cargoKey).catch(
        () => tracking,
      );
      trackingCache.set(cacheKey, { at: Date.now(), value: refreshed });
      tracking = refreshed;
    }
  }

  return {
    kind: "timeline",
    provider: "YURTICI",
    carrierName: yurtici.carrier.name || input.carrierName,
    cargoKey: input.cargoKey,
    publicUrl: tracking.trackingUrl || fallbackUrl,
    tracking,
  };
}

async function loadArasTimeline(input: {
  orderId?: string;
  status: ReturnType<typeof parseOrderStatus>;
  carrierName: string;
  cargoKey: string;
}): Promise<MemberShipmentTracking> {
  const aras = await loadArasCarrier();
  const fallbackUrl =
    trackingUrlFromTemplate(
      aras?.carrier.trackingUrlTemplate ?? shippingCarrierProviderById("ARAS").trackingUrlTemplate,
      input.cargoKey,
    ) ?? `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(input.cargoKey)}`;

  if (!aras) {
    return { kind: "link", carrierName: input.carrierName, cargoKey: input.cargoKey, publicUrl: fallbackUrl };
  }

  const cacheKey = `aras:${aras.credentials.environment}:${input.cargoKey}`;
  const cached = trackingCache.get(cacheKey);
  const now = Date.now();
  let tracking =
    cached && now - cached.at < TRACKING_CACHE_MS
      ? cached.value
      : await arasQueryTracking(aras.credentials, input.cargoKey).catch(() => cached?.value ?? null);

  if (tracking && (!cached || now - cached.at >= TRACKING_CACHE_MS)) {
    trackingCache.set(cacheKey, { at: now, value: tracking });
  }
  if (!tracking) {
    return { kind: "link", carrierName: input.carrierName, cargoKey: input.cargoKey, publicUrl: fallbackUrl };
  }

  if (tracking.pendingPickup && !tracking.found && input.orderId && input.status === "SHIPPED") {
    const ensured = await ensureArasShipmentForOrder(input.orderId);
    if (ensured.ok) {
      const refreshed = await arasQueryTracking(aras.credentials, input.cargoKey).catch(() => tracking);
      trackingCache.set(cacheKey, { at: Date.now(), value: refreshed });
      tracking = refreshed;
    }
  }

  return {
    kind: "timeline",
    provider: "ARAS",
    carrierName: aras.carrier.name || input.carrierName,
    cargoKey: input.cargoKey,
    publicUrl: tracking.trackingUrl || fallbackUrl,
    tracking,
  };
}

export async function createYurticiWarehouseShipment(input: {
  cargoKey: string;
  invoiceKey: string;
  orderNo: number;
  customerName: string;
  address: string;
  city: string;
  town: string;
  phone: string | null;
  email?: string | null;
}) {
  const yurtici = await loadYurticiCarrier();
  if (!yurtici) {
    return { ok: false as const, error: "Yurtiçi Kargo API bilgileri kayıtlı değil." };
  }

  const phone = yurticiPhoneDigits(input.phone);
  if (phone.length < 10) {
    return { ok: false as const, error: "Yurtiçi Kargo için 10 haneli alıcı telefonu gerekli." };
  }

  const receiverName =
    input.customerName.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü\s]/g, " ").replace(/\s+/g, " ").trim() ||
    "Alıcı Müşteri";
  const address = input.address.trim() || `${input.town} ${input.city}`.trim();

  try {
    const result = await yurticiCreateShipment(yurtici.credentials, {
      cargoKey: input.cargoKey.slice(0, 20),
      invoiceKey: input.invoiceKey.slice(0, 20),
      receiverCustName: receiverName.length >= 5 ? receiverName : `${receiverName} Alıcı`,
      receiverAddress: address.slice(0, 200),
      receiverPhone1: phone,
      cityName: input.city,
      townName: input.town,
      emailAddress: input.email ?? "",
      cargoCount: 1,
      description: `Sipariş #${input.orderNo}`,
    });
    if (yurticiCreateAccepted(result)) return { ok: true as const };
    return {
      ok: false as const,
      error:
        yurticiResultField(result, "errMessage") ||
        result.outResult ||
        "Yurtiçi Kargo gönderisi oluşturulamadı.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yurtiçi Kargo bağlantısı başarısız.";
    return { ok: false as const, error: message };
  }
}

export async function ensureYurticiShipmentForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNo: true,
      reference: true,
      carrierName: true,
      trackingNumber: true,
      user: { select: { email: true } },
      addresses: {
        where: { kind: OrderAddressKind.SHIPPING },
        take: 1,
      },
    },
  });
  if (!order || !looksLikeYurticiName(order.carrierName ?? "")) {
    return { ok: false as const, error: "Sipariş Yurtiçi Kargo ile gönderilmiyor." };
  }
  const cargoKey = order.trackingNumber?.trim();
  const shipping = order.addresses[0];
  if (!cargoKey || !shipping) {
    return { ok: false as const, error: "Takip numarası veya teslimat adresi eksik." };
  }
  const receiver = yurticiReceiverFromAddress(shipping);
  return createYurticiWarehouseShipment({
    cargoKey,
    invoiceKey: order.reference,
    orderNo: order.orderNo,
    customerName: receiver.customerName,
    address: receiver.address,
    city: receiver.city,
    town: receiver.town,
    phone: receiver.phone,
    email: order.user.email,
  });
}

export async function cancelYurticiWarehouseShipment(cargoKey: string) {
  const yurtici = await loadYurticiCarrier();
  if (!yurtici) return;
  try {
    await yurticiCancelShipment(yurtici.credentials, cargoKey);
  } catch {
    /* Şube işlemiş olabilir; yerel geri alma yine yapılır */
  }
}

export async function createArasWarehouseShipment(input: {
  cargoKey: string;
  invoiceKey: string;
  orderNo: number;
  customerName: string;
  address: string;
  city: string;
  town: string;
  phone: string | null;
}) {
  const aras = await loadArasCarrier();
  if (!aras) {
    return { ok: false as const, error: "Aras Kargo API bilgileri kayıtlı değil." };
  }

  const phone = arasPhoneDigits(input.phone);
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false as const, error: "Aras Kargo için 10 haneli alıcı telefonu gerekli." };
  }

  const receiverName =
    input.customerName.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü\s]/g, " ").replace(/\s+/g, " ").trim() ||
    "Alıcı Müşteri";
  const address = input.address.trim() || `${input.town} ${input.city}`.trim();

  try {
    const result = await arasSetOrder(aras.credentials, {
      integrationCode: input.cargoKey.slice(0, 30),
      invoiceNumber: input.invoiceKey.slice(0, 30),
      receiverName: receiverName.length >= 5 ? receiverName : `${receiverName} Alıcı`,
      receiverAddress: address.slice(0, 250),
      receiverPhone: phone,
      cityName: input.city,
      townName: input.town,
      description: `Sipariş #${input.orderNo}`,
      pieceCount: 1,
    });
    if (arasCreateAccepted(result)) return { ok: true as const };
    return {
      ok: false as const,
      error: result.resultMessage || "Aras Kargo gönderisi oluşturulamadı.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aras Kargo bağlantısı başarısız.";
    return { ok: false as const, error: message };
  }
}

export async function ensureArasShipmentForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNo: true,
      reference: true,
      carrierName: true,
      trackingNumber: true,
      addresses: {
        where: { kind: OrderAddressKind.SHIPPING },
        take: 1,
      },
    },
  });
  if (!order || !looksLikeArasName(order.carrierName ?? "")) {
    return { ok: false as const, error: "Sipariş Aras Kargo ile gönderilmiyor." };
  }
  const cargoKey = order.trackingNumber?.trim();
  const shipping = order.addresses[0];
  if (!cargoKey || !shipping) {
    return { ok: false as const, error: "Takip numarası veya teslimat adresi eksik." };
  }
  const receiver = yurticiReceiverFromAddress(shipping);
  return createArasWarehouseShipment({
    cargoKey,
    invoiceKey: order.reference,
    orderNo: order.orderNo,
    customerName: receiver.customerName,
    address: receiver.address,
    city: receiver.city,
    town: receiver.town,
    phone: receiver.phone,
  });
}

export async function cancelArasWarehouseShipment(cargoKey: string) {
  const aras = await loadArasCarrier();
  if (!aras) return;
  try {
    await arasCancelDispatch(aras.credentials, cargoKey);
  } catch {
    /* Şube işlemiş olabilir; yerel geri alma yine yapılır */
  }
}

export async function createIntegratedWarehouseShipment(input: {
  carrierName: string;
  cargoKey: string;
  invoiceKey: string;
  orderNo: number;
  customerName: string;
  address: string;
  city: string;
  town: string;
  phone: string | null;
  email?: string | null;
}) {
  if (looksLikeYurticiName(input.carrierName)) {
    return createYurticiWarehouseShipment(input);
  }
  if (looksLikeArasName(input.carrierName)) {
    return createArasWarehouseShipment(input);
  }
  return { ok: true as const };
}

export async function cancelIntegratedWarehouseShipment(carrierName: string, cargoKey: string) {
  if (looksLikeYurticiName(carrierName)) {
    await cancelYurticiWarehouseShipment(cargoKey);
    return;
  }
  if (looksLikeArasName(carrierName)) {
    await cancelArasWarehouseShipment(cargoKey);
  }
}
