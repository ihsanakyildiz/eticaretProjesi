"use server";

import { OrderAddressKind, OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isOpenOrderCaseStatus, parseOrderCaseStatus } from "@/lib/order-cases";
import { parseOrderStatus } from "@/lib/orders";
import { syncOrderStockForStatus } from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";
import {
  cancelIntegratedWarehouseShipment,
  createIntegratedWarehouseShipment,
  looksLikeArasName,
  looksLikeYurticiName,
  usesIntegratedCarrierApi,
  yurticiReceiverFromAddress,
} from "@/lib/shipment-tracking";
import { requirePermission } from "@/lib/staff-permissions";
import {
  codesMatch,
  isWarehouseReadyStatus,
  isWarehouseShippedStatus,
  warehouseTrackingCode,
} from "@/lib/warehouse";

function revalidateWarehouse(orderId: string, reference?: string) {
  revalidatePath("/admin/warehouse");
  revalidatePath("/admin/warehouse/shipped");
  revalidatePath(`/admin/warehouse/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/uye/siparisler");
  if (reference) revalidatePath(`/uye/siparisler/${reference}`);
}

async function requireWarehouseUpdate() {
  return requirePermission("warehouse", "update");
}

export type WarehouseScanResult =
  | {
      ok: true;
      match: true;
      itemId: string;
      packedQuantity: number;
      quantity: number;
      fullyPacked: boolean;
    }
  | { ok: true; match: false; scanned: string; message: string }
  | { ok: false; error: string };

export async function scanWarehouseBarcodeAction(input: {
  orderId: string;
  code: string;
}): Promise<WarehouseScanResult> {
  const gate = await requireWarehouseUpdate();
  if (!gate.ok) return { ok: false, error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const scanned = String(input.code ?? "").trim();
  if (!orderId) return { ok: false, error: "Sipariş bulunamadı." };
  if (!scanned) return { ok: true, match: false, scanned: "", message: "Barkod okunamadı." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sku: true,
          quantity: true,
          packedQuantity: true,
          variant: { select: { sku: true, barcode: true } },
        },
      },
      cases: { select: { status: true } },
    },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };
  if (!isWarehouseReadyStatus(parseOrderStatus(order.status))) {
    return { ok: false, error: "Bu sipariş depodan kargoya çıkarılamaz." };
  }
  if (order.cases.some((row) => isOpenOrderCaseStatus(parseOrderCaseStatus(row.status)))) {
    return { ok: false, error: "Açık iptal/iade talebi olan sipariş paketlenemez." };
  }

  const barcodeHits = order.items.filter((item) => codesMatch(scanned, item.variant?.barcode));
  if (barcodeHits.length > 1) {
    return {
      ok: true,
      match: false,
      scanned,
      message:
        "Bu barkod birden fazla varyantta kayıtlı. Katalogdaki tekrarlayan barkodları düzeltmeden paketleme yapılamaz.",
    };
  }

  const skuHits = order.items.filter(
    (item) => codesMatch(scanned, item.sku) || codesMatch(scanned, item.variant?.sku),
  );
  const matching = barcodeHits.length === 1 ? barcodeHits : skuHits;
  if (matching.length === 0) {
    return {
      ok: true,
      match: false,
      scanned,
      message: "Okutulan barkod bu siparişteki ürünlerle eşleşmiyor.",
    };
  }

  const target = matching.find((item) => item.packedQuantity < item.quantity);
  if (!target) {
    return {
      ok: true,
      match: false,
      scanned,
      message: "Bu ürün için sipariş adedi zaten tamamlandı.",
    };
  }

  const updated = await prisma.orderItem.updateMany({
    where: { id: target.id, packedQuantity: { lt: target.quantity } },
    data: { packedQuantity: { increment: 1 } },
  });
  if (updated.count !== 1) {
    return {
      ok: true,
      match: false,
      scanned,
      message: "Bu ürün için sipariş adedi zaten tamamlandı.",
    };
  }

  if (order.status === OrderStatus.PAYMENT_ACCEPTED) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PROCESSING },
    });
    await prisma.orderStatusEvent.create({
      data: { orderId: order.id, status: OrderStatus.PROCESSING, note: "Depo paketlemeye başladı" },
    });
  }

  const nextPacked = target.packedQuantity + 1;
  const fullyPacked = order.items.every((item) =>
    item.id === target.id ? nextPacked >= item.quantity : item.packedQuantity >= item.quantity,
  );
  revalidateWarehouse(order.id);
  return {
    ok: true,
    match: true,
    itemId: target.id,
    packedQuantity: nextPacked,
    quantity: target.quantity,
    fullyPacked,
  };
}

export async function resetWarehousePackAction(input: { orderId: string }) {
  const gate = await requireWarehouseUpdate();
  if (!gate.ok) return { error: gate.error };
  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { error: "Sipariş bulunamadı." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return { error: "Sipariş bulunamadı." };
  if (!isWarehouseReadyStatus(parseOrderStatus(order.status))) {
    return { error: "Kargoya çıkmış siparişin paketlemesi sıfırlanamaz." };
  }

  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { packedQuantity: 0 },
  });
  revalidateWarehouse(orderId);
  return { success: true, message: "Paketleme sıfırlandı." };
}

export async function shipPackedOrderAction(input: {
  orderId: string;
  carrierName?: string;
}): Promise<{ error?: string; success?: boolean; message?: string; trackingNumber?: string }> {
  const gate = await requireWarehouseUpdate();
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { error: "Sipariş bulunamadı." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      reference: true,
      status: true,
      carrierName: true,
      trackingNumber: true,
      user: { select: { email: true } },
      addresses: {
        where: { kind: OrderAddressKind.SHIPPING },
        take: 1,
      },
      items: { select: { quantity: true, packedQuantity: true } },
      cases: { select: { status: true } },
    },
  });
  if (!order) return { error: "Sipariş bulunamadı." };
  if (!isWarehouseReadyStatus(parseOrderStatus(order.status))) {
    return { error: "Bu sipariş zaten kargoda veya kargoya uygun değil." };
  }
  if (order.cases.some((row) => isOpenOrderCaseStatus(parseOrderCaseStatus(row.status)))) {
    return { error: "Açık iptal/iade talebi olan sipariş kargoya çıkarılamaz." };
  }
  if (order.items.length === 0 || order.items.some((item) => item.packedQuantity < item.quantity)) {
    return { error: "Tüm ürünler okutulmadan kargoya çıkarılamaz." };
  }

  const carrierName = input.carrierName?.trim().slice(0, 191) || order.carrierName || "Depo";
  const trackingNumber = (
    order.trackingNumber?.trim() || warehouseTrackingCode(order.orderNo, order.reference)
  ).slice(0, usesIntegratedCarrierApi(carrierName) ? 20 : 100);

  if (usesIntegratedCarrierApi(carrierName)) {
    const shipping = order.addresses[0];
    const label = looksLikeArasName(carrierName) ? "Aras Kargo" : "Yurtiçi Kargo";
    if (!shipping) {
      return { error: `Teslimat adresi olmadan ${label} gönderisi oluşturulamaz.` };
    }
    const receiver = yurticiReceiverFromAddress(shipping);
    const created = await createIntegratedWarehouseShipment({
      carrierName,
      cargoKey: trackingNumber,
      invoiceKey: order.reference,
      orderNo: order.orderNo,
      customerName: receiver.customerName,
      address: receiver.address,
      city: receiver.city,
      town: receiver.town,
      phone: receiver.phone,
      email: order.user.email,
    });
    if (!created.ok) return { error: created.error };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.SHIPPED,
        carrierName,
        trackingNumber,
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: OrderStatus.SHIPPED,
        note: looksLikeYurticiName(carrierName)
          ? `Yurtiçi Kargo bildirildi · ${trackingNumber}`
          : looksLikeArasName(carrierName)
            ? `Aras Kargo bildirildi · ${trackingNumber}`
            : `Depo kargo transfer · ${trackingNumber}`,
      },
    });
  });

  revalidateWarehouse(order.id, order.reference);
  return {
    success: true,
    message: looksLikeYurticiName(carrierName)
      ? "Sipariş Yurtiçi Kargo’ya bildirildi. Etiketi yazdırıp pakete yapıştırın."
      : looksLikeArasName(carrierName)
        ? "Sipariş Aras Kargo’ya bildirildi. Etiketi yazdırıp pakete yapıştırın."
        : "Sipariş kargoya çıkarıldı. Etiketi yazdırıp pakete yapıştırın.",
    trackingNumber,
  };
}

export async function returnShippedOrderToReadyAction(input: { orderId: string }) {
  const gate = await requirePermission("warehouse", "delete");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return { error: "Sipariş bulunamadı." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      carrierName: true,
      trackingNumber: true,
      cases: { select: { status: true } },
    },
  });
  if (!order) return { error: "Sipariş bulunamadı." };
  if (!isWarehouseShippedStatus(parseOrderStatus(order.status))) {
    return { error: "Yalnızca kargoya verilmiş sipariş gönderime hazır listesine alınabilir." };
  }
  if (order.cases.some((row) => isOpenOrderCaseStatus(parseOrderCaseStatus(row.status)))) {
    return { error: "Açık iptal veya iade talebi varken kargo çıkışı geri alınamaz." };
  }

  if (order.trackingNumber) {
    await cancelIntegratedWarehouseShipment(order.carrierName ?? "", order.trackingNumber);
  }

  await prisma.$transaction(async (tx) => {
    await syncOrderStockForStatus(tx, order.id, OrderStatus.PROCESSING);
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PROCESSING,
        trackingNumber: null,
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: OrderStatus.PROCESSING,
        note: "Depo kargo çıkışı geri alındı",
      },
    });
  });

  revalidateWarehouse(order.id, order.reference);
  return {
    success: true,
    message: "Sipariş gönderime hazır listesine alındı. Gerekirse paketlemeyi sıfırlayabilirsiniz.",
  };
}
