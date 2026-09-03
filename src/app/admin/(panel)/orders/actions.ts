"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { OrderAddressKind, OrderStatus, Role } from "@prisma/client";
import { requirePermission } from "@/lib/staff-permissions";
import {
  nextDocumentNumber,
  nextOrderNo,
  parseWeightKg,
  pricedLine,
  pricedLineFromIncl,
  prismaDocumentKind,
  prismaOrderStatus,
  prismaPaymentMethod,
  recalculateOrderTotals,
  snapshotAddress,
  uniqueOrderReference,
} from "@/lib/order-server";
import {
  orderDocumentKindLabel,
  orderStatusLabel,
  parseOrderDocumentKind,
  parseOrderPaymentMethod,
  parseOrderStatus,
  type OrderDocumentKindCode,
  type OrderPaymentMethodCode,
  type OrderStatusCode,
} from "@/lib/orders";
import { getSettingsMapUncached } from "@/lib/settings";
import { getSmtpConfigFromSettings, isSmtpReady, sendMailWithConfig } from "@/lib/smtp";
import { parseMajorToMinor } from "@/lib/product-money";
import { executeOrderRefund, paidTotalMinor, refundedTotalMinor } from "@/lib/order-refunds";
import { getClientIp } from "@/lib/request-ip";
import { goodsHaveLeftWarehouse, statusChangeBlockedByFulfillment } from "@/lib/order-cases";
import {
  applyReservedStockDelta,
  releaseOrderStock,
  StockShortageError,
  syncOrderStockForStatus,
} from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";

export type OrderFormState = {
  error?: string;
  success?: boolean;
  message?: string;
  redirectId?: string;
};

function revalidateOrders(id?: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/uye/siparisler");
  revalidateTag("products");
  if (id) {
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath(`/admin/orders/${id}/documents`, "layout");
  }
}

function parseItemsJson(raw: string): { variantId: string; quantity: number }[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const variantId = typeof record.variantId === "string" ? record.variantId.trim() : "";
        const quantity = Number(record.quantity);
        return { variantId, quantity: Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 0 };
      })
      .filter((item) => item.variantId && item.quantity > 0);
  } catch {
    return [];
  }
}

export async function createOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const gate = await requirePermission("orders", "create");
  if (!gate.ok) return { error: gate.error };

  const customerId = String(formData.get("customerId") ?? "").trim();
  const shippingAddressId = String(formData.get("shippingAddressId") ?? "").trim();
  const billingAddressId = String(formData.get("billingAddressId") ?? "").trim();
  const paymentMethod = parseOrderPaymentMethod(String(formData.get("paymentMethod") ?? ""));
  const status = parseOrderStatus(String(formData.get("status") ?? "AWAITING_PAYMENT"));
  const carrierName = String(formData.get("carrierName") ?? "").trim().slice(0, 191) || null;
  const privateNote = String(formData.get("privateNote") ?? "").trim().slice(0, 4000) || null;
  const shippingMinor = parseMajorToMinor(String(formData.get("shipping") ?? "0")) ?? 0;
  const items = parseItemsJson(String(formData.get("itemsJson") ?? "[]"));

  if (!customerId) return { error: "Müşteri seçin." };
  if (!shippingAddressId || !billingAddressId) return { error: "Teslimat ve fatura adresi seçin." };
  if (items.length === 0) return { error: "En az bir ürün ekleyin." };

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    include: { addresses: true },
  });
  if (!customer || customer.role !== Role.MEMBER) return { error: "Müşteri bulunamadı." };

  const shipping = customer.addresses.find((address) => address.id === shippingAddressId);
  const billing = customer.addresses.find((address) => address.id === billingAddressId);
  if (!shipping || !billing) return { error: "Seçilen adres bu müşteriye ait değil." };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((item) => item.variantId) }, isActive: true },
    include: { product: { select: { title: true, image: true, taxRatePercent: true, isActive: true } } },
  });
  const uniqueVariantIds = Array.from(new Set(items.map((item) => item.variantId)));
  if (variants.length !== uniqueVariantIds.length) {
    return { error: "Bazı ürünler bulunamadı veya pasif." };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      let productsMinor = 0;
      let taxMinor = 0;
      const lineData = items.map((item) => {
        const variant = variants.find((row) => row.id === item.variantId);
        if (!variant) throw new Error("VARIANT");
        const priced = pricedLine({
          priceExclMinor: variant.priceMinor,
          taxRatePercent: variant.product.taxRatePercent,
          quantity: item.quantity,
        });
        productsMinor += priced.totalMinor;
        taxMinor += priced.taxMinor;
        return {
          productId: variant.productId,
          variantId: variant.id,
          title: variant.product.title,
          variantTitle: variant.isDefault ? null : variant.title,
          sku: variant.sku,
          quantity: item.quantity,
          unitPriceMinor: priced.unitPriceMinor,
          taxRatePercent: variant.product.taxRatePercent,
          totalMinor: priced.totalMinor,
          image: variant.image || variant.product.image,
        };
      });

      const order = await tx.order.create({
        data: {
          orderNo: await nextOrderNo(tx),
          reference: await uniqueOrderReference(tx),
          userId: customer.id,
          status: prismaOrderStatus(status),
          paymentMethod: prismaPaymentMethod(paymentMethod),
          productsMinor,
          shippingMinor,
          taxMinor,
          totalMinor: productsMinor + shippingMinor,
          carrierName,
          privateNote,
          items: { create: lineData },
          addresses: {
            create: [
              snapshotAddress(OrderAddressKind.SHIPPING, shipping),
              snapshotAddress(OrderAddressKind.BILLING, billing),
            ],
          },
          statusHistory: {
            create: { status: prismaOrderStatus(status) },
          },
        },
      });
      await syncOrderStockForStatus(tx, order.id, prismaOrderStatus(status));
      return order;
    });

    revalidateOrders(created.id);
    return { success: true, message: "Sipariş oluşturuldu.", redirectId: created.id };
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { error: `"${error.productTitle}" için yeterli stok yok.` };
    }
    console.error(error);
    return { error: "Sipariş kaydedilirken bir hata oluştu." };
  }
}

export async function updateOrderStatusAction(input: { id: string; status: OrderStatusCode }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Sipariş bulunamadı." };
  const status = parseOrderStatus(input.status);

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentProvider: true,
      payments: { select: { amountMinor: true } },
      refunds: { select: { amountMinor: true } },
    },
  });
  if (!order) return { error: "Sipariş bulunamadı." };

  const blocked = statusChangeBlockedByFulfillment(parseOrderStatus(order.status), status);
  if (blocked) return { error: blocked };

  const remaining = Math.max(0, paidTotalMinor(order.payments) - refundedTotalMinor(order.refunds));

  if (status === "CANCELED" || status === "REFUNDED") {
    if (remaining > 0) {
      const refunded = await executeOrderRefund({
        orderId: id,
        amountMinor: remaining,
        note: status === "CANCELED" ? "Sipariş iptali" : "Sipariş iadesi",
        ip: await getClientIp(),
        restock: status === "CANCELED" || !goodsHaveLeftWarehouse(parseOrderStatus(order.status)),
        orderStatusOnFullRefund: status === "CANCELED" ? OrderStatus.CANCELED : OrderStatus.REFUNDED,
      });
      if (!refunded.ok) return { error: refunded.error };
      revalidateOrders(id);
      return {
        success: true,
        message:
          status === "CANCELED"
            ? "Sipariş iptal edildi. Ödeme iade edildi ve stok geri alındı."
            : "İade tamamlandı. Tutar müşteriye gönderildi.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const nextStatus = prismaOrderStatus(status);
      await syncOrderStockForStatus(tx, id, nextStatus);
      await tx.order.update({
        where: { id },
        data: { status: nextStatus },
      });
      await tx.orderStatusEvent.create({
        data: { orderId: id, status: nextStatus },
      });
    });
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { error: `"${error.productTitle}" için yeterli stok yok. Durum değiştirilemedi.` };
    }
    console.error(error);
    return { error: "Durum güncellenemedi." };
  }
  revalidateOrders(id);
  return { success: true, message: "Durum güncellendi." };
}

export async function addOrderPaymentAction(input: {
  id: string;
  method: OrderPaymentMethodCode;
  amount: string;
  transactionId?: string;
}) {
  const gate = await requirePermission("orders", "create");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  const amountMinor = parseMajorToMinor(input.amount);
  if (!id) return { error: "Sipariş bulunamadı." };
  if (amountMinor === null || amountMinor <= 0) return { error: "Geçerli bir tutar girin." };

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) return { error: "Sipariş bulunamadı." };

  await prisma.orderPayment.create({
    data: {
      orderId: id,
      method: prismaPaymentMethod(parseOrderPaymentMethod(input.method)),
      amountMinor,
      transactionId: input.transactionId?.trim().slice(0, 191) || null,
    },
  });
  revalidateOrders(id);
  return { success: true, message: "Ödeme eklendi." };
}

export async function refundOrderAction(input: { id: string; amount: string; note?: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  const amountMinor = parseMajorToMinor(input.amount);
  if (!id) return { error: "Sipariş bulunamadı." };
  if (amountMinor === null || amountMinor <= 0) return { error: "Geçerli bir iade tutarı girin." };

  const result = await executeOrderRefund({
    orderId: id,
    amountMinor,
    note: input.note,
    ip: await getClientIp(),
  });
  if (!result.ok) return { error: result.error };

  revalidateOrders(id);
  return {
    success: true,
    message: result.fullyRefunded
      ? "İade tamamlandı. Tutar müşteriye gönderildi."
      : "Kısmi iade kaydedildi. Tutar müşteriye gönderildi.",
  };
}

export async function updateOrderNoteAction(input: { id: string; privateNote: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Sipariş bulunamadı." };

  await prisma.order.update({
    where: { id },
    data: { privateNote: input.privateNote.trim().slice(0, 4000) || null },
  });
  revalidateOrders(id);
  return { success: true, message: "Not kaydedildi." };
}

export async function addOrderMessageAction(input: {
  id: string;
  body: string;
  visibleToCustomer: boolean;
}) {
  const gate = await requirePermission("orders", "create");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  const body = input.body.trim().slice(0, 1200);
  if (!id) return { error: "Sipariş bulunamadı." };
  if (!body) return { error: "Mesaj yazın." };

  await prisma.orderMessage.create({
    data: {
      orderId: id,
      body,
      visibleToCustomer: input.visibleToCustomer,
    },
  });
  revalidateOrders(id);
  return { success: true, message: "Mesaj kaydedildi." };
}

export async function updateOrderShippingAction(input: {
  id: string;
  carrierName: string;
  trackingNumber: string;
  shipping?: string;
  weightKg?: string;
}) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Sipariş bulunamadı." };

  const shippingMinor =
    input.shipping === undefined ? undefined : parseMajorToMinor(input.shipping);
  if (input.shipping !== undefined && shippingMinor === null) {
    return { error: "Geçerli bir kargo ücreti girin." };
  }

  const weightKg = input.weightKg === undefined ? undefined : parseWeightKg(input.weightKg);
  if (input.weightKg !== undefined && input.weightKg.trim() !== "" && weightKg === null) {
    return { error: "Geçerli bir ağırlık girin." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          carrierName: input.carrierName.trim().slice(0, 191) || null,
          trackingNumber: input.trackingNumber.trim().slice(0, 100) || null,
          ...(typeof shippingMinor === "number" ? { shippingMinor } : {}),
          ...(input.weightKg !== undefined ? { weightKg: weightKg ?? null } : {}),
        },
      });
      if (typeof shippingMinor === "number") {
        await recalculateOrderTotals(tx, id);
      }
    });
  } catch (error) {
    console.error(error);
    return { error: "Kargo bilgisi kaydedilemedi." };
  }

  revalidateOrders(id);
  return { success: true, message: "Kargo bilgisi güncellendi." };
}

export async function createOrderDocumentAction(input: {
  orderId: string;
  kind: OrderDocumentKindCode;
}) {
  const gate = await requirePermission("orders", "create");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const kind = parseOrderDocumentKind(input.kind);
  if (!orderId) return { error: "Sipariş bulunamadı." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, totalMinor: true },
  });
  if (!order) return { error: "Sipariş bulunamadı." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderDocument.create({
        data: {
          orderId,
          kind: prismaDocumentKind(kind),
          number: await nextDocumentNumber(tx, kind),
          amountMinor: order.totalMinor,
        },
      });
    });
  } catch (error) {
    console.error(error);
    return { error: `${orderDocumentKindLabel(kind)} oluşturulamadı.` };
  }

  revalidateOrders(orderId);
  return { success: true, message: `${orderDocumentKindLabel(kind)} oluşturuldu.` };
}

export async function deleteOrderDocumentAction(input: { orderId: string; documentId: string }) {
  const gate = await requirePermission("orders", "delete");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const documentId = String(input.documentId ?? "").trim();
  if (!orderId || !documentId) return { error: "Belge bulunamadı." };

  const document = await prisma.orderDocument.findFirst({
    where: { id: documentId, orderId },
    select: { id: true },
  });
  if (!document) return { error: "Belge bulunamadı." };

  await prisma.orderDocument.delete({ where: { id: document.id } });
  revalidateOrders(orderId);
  return { success: true, message: "Belge silindi." };
}

export async function resendOrderStatusEmailAction(input: { orderId: string; eventId: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const eventId = String(input.eventId ?? "").trim();
  if (!orderId || !eventId) return { error: "Kayıt bulunamadı." };

  const event = await prisma.orderStatusEvent.findFirst({
    where: { id: eventId, orderId },
    include: {
      order: {
        select: {
          orderNo: true,
          reference: true,
          user: { select: { email: true, firstName: true, lastName: true, name: true } },
        },
      },
    },
  });
  if (!event) return { error: "Durum kaydı bulunamadı." };

  const settings = await getSettingsMapUncached();
  const smtp = getSmtpConfigFromSettings(settings);
  if (!isSmtpReady(smtp)) {
    return { error: "SMTP ayarları eksik. E-posta gönderilemedi." };
  }

  const status = parseOrderStatus(event.status);
  const label = orderStatusLabel(status);
  const name = [event.order.user.firstName, event.order.user.lastName].filter(Boolean).join(" ") ||
    event.order.user.name ||
    "";

  try {
    await sendMailWithConfig(smtp, {
      to: event.order.user.email,
      subject: `Sipariş #${event.order.orderNo} · ${label}`,
      text: `Siparişiniz #${event.order.orderNo} (${event.order.reference}) durumu: ${label}.`,
      html: `<p>Merhaba${name ? ` ${name}` : ""},</p>
<p>Siparişiniz <strong>#${event.order.orderNo}</strong> (${event.order.reference}) güncellendi.</p>
<p>Güncel durum: <strong>${label}</strong></p>`,
    });
  } catch (error) {
    console.error(error);
    return { error: "E-posta gönderilemedi." };
  }

  return { success: true, message: "Durum e-postası gönderildi." };
}

export async function addOrderItemAction(input: {
  orderId: string;
  variantId: string;
  quantity: number;
  unitPriceIncl: string;
}) {
  const gate = await requirePermission("orders", "create");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const variantId = String(input.variantId ?? "").trim();
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 0));
  const unitInclMinor = parseMajorToMinor(input.unitPriceIncl);

  if (!orderId) return { error: "Sipariş bulunamadı." };
  if (!variantId) return { error: "Ürün seçin." };
  if (quantity < 1) return { error: "Adet en az 1 olmalı." };
  if (unitInclMinor === null || unitInclMinor <= 0) return { error: "Geçerli bir birim fiyat girin." };

  const [order, variant] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, select: { id: true } }),
    prisma.productVariant.findFirst({
      where: { id: variantId, isActive: true, product: { isActive: true } },
      include: { product: { select: { title: true, image: true, taxRatePercent: true } } },
    }),
  ]);
  if (!order) return { error: "Sipariş bulunamadı." };
  if (!variant) return { error: "Ürün bulunamadı veya pasif." };

  const priced = pricedLineFromIncl({
    unitInclMinor,
    taxRatePercent: variant.product.taxRatePercent,
    quantity,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await applyReservedStockDelta(tx, {
        orderId,
        variantId: variant.id,
        quantityDelta: quantity,
        title: variant.product.title,
      });
      await tx.orderItem.create({
        data: {
          orderId,
          productId: variant.productId,
          variantId: variant.id,
          title: variant.product.title,
          variantTitle: variant.isDefault ? null : variant.title,
          sku: variant.sku,
          quantity,
          unitPriceMinor: priced.unitPriceMinor,
          taxRatePercent: variant.product.taxRatePercent,
          totalMinor: priced.totalMinor,
          image: variant.image || variant.product.image,
        },
      });
      await recalculateOrderTotals(tx, orderId);
    });
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { error: `"${error.productTitle}" için yeterli stok yok.` };
    }
    console.error(error);
    return { error: "Ürün eklenirken bir hata oluştu." };
  }

  revalidateOrders(orderId);
  return { success: true, message: "Ürün eklendi." };
}

export async function updateOrderItemAction(input: {
  orderId: string;
  itemId: string;
  quantity: number;
  unitPriceIncl: string;
}) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const itemId = String(input.itemId ?? "").trim();
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 0));
  const unitInclMinor = parseMajorToMinor(input.unitPriceIncl);

  if (!orderId || !itemId) return { error: "Satır bulunamadı." };
  if (quantity < 1) return { error: "Adet en az 1 olmalı." };
  if (unitInclMinor === null || unitInclMinor <= 0) return { error: "Geçerli bir birim fiyat girin." };

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    select: { id: true, taxRatePercent: true, quantity: true, variantId: true, title: true },
  });
  if (!item) return { error: "Satır bulunamadı." };

  const priced = pricedLineFromIncl({
    unitInclMinor,
    taxRatePercent: item.taxRatePercent,
    quantity,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await applyReservedStockDelta(tx, {
        orderId,
        variantId: item.variantId,
        quantityDelta: quantity - item.quantity,
        title: item.title,
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity,
          unitPriceMinor: priced.unitPriceMinor,
          totalMinor: priced.totalMinor,
        },
      });
      await recalculateOrderTotals(tx, orderId);
    });
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { error: `"${error.productTitle}" için yeterli stok yok.` };
    }
    console.error(error);
    return { error: "Satır güncellenirken bir hata oluştu." };
  }

  revalidateOrders(orderId);
  return { success: true, message: "Satır güncellendi." };
}

export async function deleteOrderItemAction(input: { orderId: string; itemId: string }) {
  const gate = await requirePermission("orders", "delete");
  if (!gate.ok) return { error: gate.error };

  const orderId = String(input.orderId ?? "").trim();
  const itemId = String(input.itemId ?? "").trim();
  if (!orderId || !itemId) return { error: "Satır bulunamadı." };

  const count = await prisma.orderItem.count({ where: { orderId } });
  if (count <= 1) return { error: "Siparişte en az bir ürün kalmalı." };

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
    select: { id: true, variantId: true, quantity: true, title: true },
  });
  if (!item) return { error: "Satır bulunamadı." };

  try {
    await prisma.$transaction(async (tx) => {
      await applyReservedStockDelta(tx, {
        orderId,
        variantId: item.variantId,
        quantityDelta: -item.quantity,
        title: item.title,
      });
      await tx.orderItem.delete({ where: { id: item.id } });
      await recalculateOrderTotals(tx, orderId);
    });
  } catch (error) {
    console.error(error);
    return { error: "Satır silinirken bir hata oluştu." };
  }

  revalidateOrders(orderId);
  return { success: true, message: "Ürün silindi." };
}

export async function deleteOrderAction(input: { id: string }) {
  const gate = await requirePermission("orders", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Sipariş bulunamadı." };
  try {
    await prisma.$transaction(async (tx) => {
      await releaseOrderStock(tx, id);
      await tx.order.delete({ where: { id } });
    });
  } catch (error) {
    console.error(error);
    return { error: "Sipariş silinemedi." };
  }
  revalidateOrders();
  return { success: true, message: "Sipariş silindi." };
}

export async function deleteOrdersAction(input: { ids: string[] }) {
  const gate = await requirePermission("orders", "delete");
  if (!gate.ok) return { error: gate.error };

  const ids = Array.from(
    new Set((input.ids ?? []).map((id) => String(id ?? "").trim()).filter(Boolean)),
  );
  if (ids.length === 0) return { error: "Silinecek sipariş seçin." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        await releaseOrderStock(tx, id);
      }
      await tx.order.deleteMany({ where: { id: { in: ids } } });
    });
  } catch (error) {
    console.error(error);
    return { error: "Siparişler silinemedi." };
  }
  revalidateOrders();
  return { success: true, message: `${ids.length} sipariş silindi.` };
}
