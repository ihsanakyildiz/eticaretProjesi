import "server-only";

import {
  OrderCaseKind,
  OrderCaseReason,
  OrderCaseStatus,
  OrderReturnCondition,
  OrderStatus,
  type Prisma,
} from "@prisma/client";
import {
  canOpenCancelCase,
  canOpenReturnCase,
  isOpenOrderCaseStatus,
  parseOrderCaseKind,
  parseOrderCaseReason,
  parseOrderCaseStatus,
  parseOrderReturnCondition,
  type OrderCaseKindCode,
  type OrderCaseReasonCode,
  type OrderCaseView,
  type OrderReturnConditionCode,
} from "@/lib/order-cases";
import { executeOrderRefund, paidTotalMinor, refundedTotalMinor } from "@/lib/order-refunds";
import { parseOrderStatus } from "@/lib/orders";
import {
  markOrderStockReleased,
  releaseOrderStock,
  restockOrderItemQuantities,
} from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type OrderCaseActionResult =
  | { ok: true; message: string; caseId: string }
  | { ok: false; error: string };

export type OrderCaseLineInput = {
  orderItemId: string;
  quantity: number;
};

const OPEN_STATUSES: OrderCaseStatus[] = [
  OrderCaseStatus.REQUESTED,
  OrderCaseStatus.APPROVED,
  OrderCaseStatus.AWAITING_RETURN,
  OrderCaseStatus.RECEIVED,
];

function prismaCaseKind(kind: OrderCaseKindCode): OrderCaseKind {
  switch (kind) {
    case "CANCEL":
      return OrderCaseKind.CANCEL;
    case "RETURN":
      return OrderCaseKind.RETURN;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function prismaCaseReason(reason: OrderCaseReasonCode): OrderCaseReason {
  switch (reason) {
    case "CHANGED_MIND":
      return OrderCaseReason.CHANGED_MIND;
    case "DEFECTIVE":
      return OrderCaseReason.DEFECTIVE;
    case "WRONG_ITEM":
      return OrderCaseReason.WRONG_ITEM;
    case "DAMAGED":
      return OrderCaseReason.DAMAGED;
    case "NOT_DELIVERED":
      return OrderCaseReason.NOT_DELIVERED;
    case "OTHER":
      return OrderCaseReason.OTHER;
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function prismaReturnCondition(condition: OrderReturnConditionCode): OrderReturnCondition {
  switch (condition) {
    case "PENDING":
      return OrderReturnCondition.PENDING;
    case "SELLABLE":
      return OrderReturnCondition.SELLABLE;
    case "UNSALEABLE":
      return OrderReturnCondition.UNSALEABLE;
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

function randomCaseSuffix() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < 6; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

async function uniqueCaseCode(tx: Tx, kind: OrderCaseKind) {
  const prefix = kind === OrderCaseKind.CANCEL ? "IPT" : "IAD";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `${prefix}-${randomCaseSuffix()}`;
    const existing = await tx.orderCase.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  return `${prefix}-${randomCaseSuffix()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

async function appendCaseEvent(
  tx: Tx,
  caseId: string,
  status: OrderCaseStatus,
  note?: string | null,
) {
  await tx.orderCaseEvent.create({
    data: { caseId, status, note: note?.trim().slice(0, 500) || null },
  });
}

const caseInclude = {
  items: {
    include: {
      orderItem: { select: { id: true, variantId: true, quantity: true, title: true, totalMinor: true } },
    },
  },
} satisfies Prisma.OrderCaseInclude;

async function remainingPaidMinor(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      payments: { select: { amountMinor: true } },
      refunds: { select: { amountMinor: true } },
    },
  });
  if (!order) return 0;
  return Math.max(0, paidTotalMinor(order.payments) - refundedTotalMinor(order.refunds));
}

async function claimedQuantities(orderId: string, excludeCaseId?: string) {
  const rows = await prisma.orderCaseItem.findMany({
    where: {
      case: {
        orderId,
        status: { in: OPEN_STATUSES.concat(OrderCaseStatus.COMPLETED) },
        ...(excludeCaseId ? { id: { not: excludeCaseId } } : {}),
      },
    },
    select: {
      orderItemId: true,
      quantity: true,
      restockQuantity: true,
      case: { select: { status: true, refunds: { select: { id: true }, take: 1 } } },
    },
  });
  const claimed = new Map<string, number>();
  for (const row of rows) {
    const status = parseOrderCaseStatus(row.case.status);
    const open = isOpenOrderCaseStatus(status);
    const settled = status === "COMPLETED" && (row.restockQuantity > 0 || row.case.refunds.length > 0);
    if (!open && !settled) continue;
    claimed.set(row.orderItemId, (claimed.get(row.orderItemId) ?? 0) + row.quantity);
  }
  return claimed;
}

async function resolveCaseLines(
  orderId: string,
  items: { id: string; quantity: number; title: string }[],
  requested: OrderCaseLineInput[] | undefined,
  excludeCaseId?: string,
): Promise<{ ok: true; lines: OrderCaseLineInput[] } | { ok: false; error: string }> {
  const claimed = await claimedQuantities(orderId, excludeCaseId);
  const byId = new Map(items.map((item) => [item.id, item]));
  const source =
    requested && requested.length > 0
      ? requested
      : items.map((item) => ({
          orderItemId: item.id,
          quantity: Math.max(0, item.quantity - (claimed.get(item.id) ?? 0)),
        }));

  const lines: OrderCaseLineInput[] = [];
  for (const row of source) {
    const item = byId.get(row.orderItemId);
    if (!item) return { ok: false, error: "Sipariş kalemi bulunamadı." };
    const qty = Math.floor(row.quantity);
    if (qty <= 0) continue;
    const available = item.quantity - (claimed.get(item.id) ?? 0);
    if (qty > available) {
      return { ok: false, error: `"${item.title}" için iade/iptal adedi sipariş adedini aşıyor.` };
    }
    lines.push({ orderItemId: item.id, quantity: qty });
  }
  if (lines.length === 0) return { ok: false, error: "En az bir ürün seçin." };
  return { ok: true, lines };
}

async function finishCancelWithoutRefund(orderId: string, caseId: string, note: string) {
  await prisma.$transaction(async (tx) => {
    await releaseOrderStock(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELED },
    });
    await tx.orderStatusEvent.create({
      data: { orderId, status: OrderStatus.CANCELED, note },
    });
    await tx.orderCase.update({
      where: { id: caseId },
      data: { status: OrderCaseStatus.COMPLETED, completedAt: new Date() },
    });
    await appendCaseEvent(tx, caseId, OrderCaseStatus.COMPLETED, note);
  });
}

export async function completeCancelCase(input: {
  caseId: string;
  ip: string;
  staffNote?: string | null;
}): Promise<OrderCaseActionResult> {
  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    include: { order: { select: { id: true, status: true } } },
  });
  if (!record) return { ok: false, error: "İptal kaydı bulunamadı." };
  if (record.kind !== OrderCaseKind.CANCEL) return { ok: false, error: "Bu kayıt bir iptal talebi değil." };
  if (!isOpenOrderCaseStatus(parseOrderCaseStatus(record.status))) {
    return { ok: false, error: "Bu iptal talebi artık açık değil." };
  }
  if (!canOpenCancelCase(parseOrderStatus(record.order.status))) {
    return {
      ok: false,
      error: "Kargoya çıkmış sipariş iptal edilemez. İade sürecine geçin.",
    };
  }

  const remaining = await remainingPaidMinor(record.orderId);
  const note = (input.staffNote || record.staffNote || `İptal ${record.code}`).slice(0, 500);

  if (remaining <= 0) {
    await finishCancelWithoutRefund(record.orderId, record.id, note);
    return { ok: true, message: "Sipariş iptal edildi. Stok geri alındı.", caseId: record.id };
  }

  const refunded = await executeOrderRefund({
    orderId: record.orderId,
    amountMinor: remaining,
    note,
    ip: input.ip,
    caseId: record.id,
    restock: true,
    allowAfterShipment: false,
    orderStatusOnFullRefund: OrderStatus.CANCELED,
  });
  if (!refunded.ok) return refunded;

  await prisma.$transaction(async (tx) => {
    await tx.orderCase.update({
      where: { id: record.id },
      data: {
        status: OrderCaseStatus.COMPLETED,
        completedAt: new Date(),
        staffNote: input.staffNote?.trim().slice(0, 500) || record.staffNote,
      },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.COMPLETED, "Ödeme iade edildi, stok geri alındı.");
  });

  return {
    ok: true,
    message: "Sipariş iptal edildi. Ödeme iade edildi ve stok geri alındı.",
    caseId: record.id,
  };
}

export async function createOrderCase(input: {
  orderId: string;
  kind: OrderCaseKindCode;
  reason: OrderCaseReasonCode;
  source: "CUSTOMER" | "STAFF";
  customerNote?: string | null;
  staffNote?: string | null;
  items?: OrderCaseLineInput[];
  ip: string;
  autoCompleteCancel?: boolean;
  autoApproveReturn?: boolean;
}): Promise<OrderCaseActionResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      items: { select: { id: true, quantity: true, title: true } },
    },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };

  const orderStatus = parseOrderStatus(order.status);
  if (input.kind === "CANCEL" && !canOpenCancelCase(orderStatus)) {
    return { ok: false, error: "Bu sipariş kargoya çıktığı için iptal açılamaz. İade talebi oluşturun." };
  }
  if (input.kind === "RETURN" && !canOpenReturnCase(orderStatus)) {
    return { ok: false, error: "İade, yalnızca kargodaki veya teslim edilmiş siparişler için açılır." };
  }

  const open = await prisma.orderCase.findFirst({
    where: { orderId: order.id, status: { in: OPEN_STATUSES } },
    select: { id: true, code: true },
  });
  if (open) {
    return { ok: false, error: `Bu siparişte açık bir süreç var (${open.code}).` };
  }

  const lines = await resolveCaseLines(order.id, order.items, input.items);
  if (!lines.ok) return lines;

  const created = await prisma.$transaction(async (tx) => {
    const kind = prismaCaseKind(input.kind);
    const code = await uniqueCaseCode(tx, kind);
    const initialStatus =
      input.kind === "RETURN" && input.autoApproveReturn
        ? OrderCaseStatus.AWAITING_RETURN
        : OrderCaseStatus.REQUESTED;
    const record = await tx.orderCase.create({
      data: {
        code,
        orderId: order.id,
        kind,
        status: initialStatus,
        reason: prismaCaseReason(input.reason),
        source: input.source,
        customerNote: input.customerNote?.trim().slice(0, 500) || null,
        staffNote: input.staffNote?.trim().slice(0, 500) || null,
        items: {
          create: lines.lines.map((line) => ({
            orderItemId: line.orderItemId,
            quantity: line.quantity,
          })),
        },
      },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.REQUESTED, input.customerNote || input.staffNote);
    if (initialStatus === OrderCaseStatus.AWAITING_RETURN) {
      await appendCaseEvent(tx, record.id, OrderCaseStatus.AWAITING_RETURN, "İade onaylandı. Ürün depoya bekleniyor.");
    }
    return record;
  });

  if (input.kind === "CANCEL" && input.autoCompleteCancel) {
    const completed = await completeCancelCase({
      caseId: created.id,
      ip: input.ip,
      staffNote: input.staffNote,
    });
    if (!completed.ok) {
      return {
        ok: false,
        error: `${completed.error} Talep ${created.code} olarak kaydedildi; ödemeyi daha sonra tekrar deneyin.`,
      };
    }
    return completed;
  }

  if (input.kind === "RETURN" && input.autoApproveReturn) {
    return {
      ok: true,
      message: "İade süreci başlatıldı. Ürün depoya gelmeden ödeme iade edilmez ve stok girilmez.",
      caseId: created.id,
    };
  }

  return {
    ok: true,
    message:
      input.kind === "CANCEL"
        ? "İptal talebi alındı."
        : "İade talebi alındı. Ürün depoya gelip kontrol edilmeden ödeme iade edilmez.",
    caseId: created.id,
  };
}

export async function rejectOrderCase(input: {
  caseId: string;
  rejectReason: string;
}): Promise<OrderCaseActionResult> {
  const reason = input.rejectReason.trim().slice(0, 500);
  if (!reason) return { ok: false, error: "Red gerekçesi yazın." };

  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    select: { id: true, status: true, kind: true },
  });
  if (!record) return { ok: false, error: "Kayıt bulunamadı." };
  const status = parseOrderCaseStatus(record.status);
  if (status === "COMPLETED" || status === "REJECTED") {
    return { ok: false, error: "Bu süreç zaten kapalı." };
  }
  if (status === "RECEIVED") {
    return { ok: false, error: "Depoya gelen ürün için iadeyi reddetmek yerine “ödemesiz kapat” kullanın." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderCase.update({
      where: { id: record.id },
      data: { status: OrderCaseStatus.REJECTED, rejectReason: reason, completedAt: new Date() },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.REJECTED, reason);
  });

  return {
    ok: true,
    message: parseOrderCaseKind(record.kind) === "CANCEL" ? "İptal talebi reddedildi." : "İade talebi reddedildi.",
    caseId: record.id,
  };
}

export async function approveReturnCase(input: { caseId: string }): Promise<OrderCaseActionResult> {
  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    select: { id: true, status: true, kind: true },
  });
  if (!record) return { ok: false, error: "Kayıt bulunamadı." };
  if (record.kind !== OrderCaseKind.RETURN) return { ok: false, error: "Bu kayıt bir iade talebi değil." };
  if (parseOrderCaseStatus(record.status) !== "REQUESTED") {
    return { ok: false, error: "Yalnızca bekleyen iade talebi onaylanabilir." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderCase.update({
      where: { id: record.id },
      data: { status: OrderCaseStatus.AWAITING_RETURN },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.APPROVED, "İade onaylandı.");
    await appendCaseEvent(tx, record.id, OrderCaseStatus.AWAITING_RETURN, "Ürün depoya bekleniyor. Ödeme henüz iade edilmedi.");
  });

  return {
    ok: true,
    message: "İade onaylandı. Ürün depoya gelmeden para gönderilmez ve stok açılmaz.",
    caseId: record.id,
  };
}

export async function receiveReturnCase(input: {
  caseId: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
}): Promise<OrderCaseActionResult> {
  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    select: { id: true, status: true, kind: true },
  });
  if (!record) return { ok: false, error: "Kayıt bulunamadı." };
  if (record.kind !== OrderCaseKind.RETURN) return { ok: false, error: "Bu kayıt bir iade talebi değil." };
  const status = parseOrderCaseStatus(record.status);
  if (status !== "AWAITING_RETURN" && status !== "APPROVED") {
    return { ok: false, error: "Depo teslimi için süreç “ürün bekleniyor” durumunda olmalıdır." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderCase.update({
      where: { id: record.id },
      data: {
        status: OrderCaseStatus.RECEIVED,
        receivedAt: new Date(),
        returnCarrierName: input.carrierName?.trim().slice(0, 191) || null,
        returnTrackingNumber: input.trackingNumber?.trim().slice(0, 100) || null,
      },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.RECEIVED, "Ürün depoya alındı. Kalite kontrol bekleniyor.");
  });

  return {
    ok: true,
    message: "Ürün depoya alındı. Satılabilirliği işaretleyip iadeyi onaylayın veya reddedin.",
    caseId: record.id,
  };
}

export async function completeReturnCase(input: {
  caseId: string;
  ip: string;
  refund: boolean;
  returnless?: boolean;
  inspections?: { itemId: string; condition: OrderReturnConditionCode }[];
  amountMinor?: number | null;
  staffNote?: string | null;
}): Promise<OrderCaseActionResult> {
  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    include: {
      ...caseInclude,
      order: { select: { id: true, status: true, stockReserved: true } },
    },
  });
  if (!record) return { ok: false, error: "Kayıt bulunamadı." };
  if (record.kind !== OrderCaseKind.RETURN) return { ok: false, error: "Bu kayıt bir iade talebi değil." };

  const status = parseOrderCaseStatus(record.status);
  if (!isOpenOrderCaseStatus(status)) return { ok: false, error: "Bu iade süreci kapalı." };

  if (input.returnless) {
    if (status === "RECEIVED") {
      return { ok: false, error: "Ürün depoya gelmiş. Ürünsüz iade kullanılamaz; kontrol sonrası kapatın." };
    }
  } else if (status !== "RECEIVED") {
    return {
      ok: false,
      error: "Ödeme iadesi için ürünün depoya alınması ve kontrol edilmesi gerekir.",
    };
  }

  if (!input.returnless && input.refund) {
    const inspectionByItem = new Map((input.inspections ?? []).map((row) => [row.itemId, row.condition]));
    for (const item of record.items) {
      const next = inspectionByItem.get(item.id) ?? parseOrderReturnCondition(item.condition);
      if (next === "PENDING") {
        return { ok: false, error: "Tüm kalemler için satılabilir / satılamaz işaretleyin." };
      }
    }
  }

  const remaining = await remainingPaidMinor(record.orderId);
  const refundAmount = input.refund
    ? Math.min(remaining, Math.max(0, input.amountMinor ?? remaining))
    : 0;
  if (input.refund && remaining > 0 && refundAmount <= 0) {
    return { ok: false, error: "İade tutarı geçersiz." };
  }

  const inspectionByItem = new Map((input.inspections ?? []).map((row) => [row.itemId, row.condition]));
  const alreadyRestocked = record.items.some((item) => item.restockQuantity > 0);
  const sellableLines =
    input.refund && !input.returnless
      ? record.items.flatMap((item) => {
          const condition = inspectionByItem.get(item.id) ?? parseOrderReturnCondition(item.condition);
          if (condition !== "SELLABLE") return [];
          return [{ variantId: item.orderItem.variantId, quantity: item.quantity }];
        })
      : [];

  await prisma.$transaction(async (tx) => {
    if (input.refund && !input.returnless && !alreadyRestocked) {
      await restockOrderItemQuantities(tx, sellableLines, record.orderId);
    }
    for (const item of record.items) {
      const condition = input.returnless
        ? OrderReturnCondition.UNSALEABLE
        : prismaReturnCondition(inspectionByItem.get(item.id) ?? parseOrderReturnCondition(item.condition));
      const restockQuantity = alreadyRestocked
        ? item.restockQuantity
        : input.refund && condition === OrderReturnCondition.SELLABLE
          ? item.quantity
          : 0;
      await tx.orderCaseItem.update({
        where: { id: item.id },
        data: { condition, restockQuantity },
      });
    }
    if (input.refund || input.returnless) {
      await markOrderStockReleased(tx, record.orderId);
    }
    await tx.orderCase.update({
      where: { id: record.id },
      data: {
        staffNote: input.staffNote?.trim().slice(0, 500) || record.staffNote,
        refundAmountMinor: input.refund ? refundAmount : 0,
        returnless: Boolean(input.returnless),
      },
    });
  });

  if (input.refund && refundAmount > 0) {
    const refunded = await executeOrderRefund({
      orderId: record.orderId,
      amountMinor: refundAmount,
      note: input.staffNote || `İade ${record.code}`,
      ip: input.ip,
      caseId: record.id,
      restock: false,
      allowAfterShipment: true,
      orderStatusOnFullRefund: OrderStatus.REFUNDED,
    });
    if (!refunded.ok) {
      return {
        ok: false,
        error: `${refunded.error} Stok kontrolü kaydedildi; ödemeyi tekrar deneyin.`,
      };
    }
  } else if (input.refund && remaining <= 0) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: record.orderId },
        data: { status: OrderStatus.REFUNDED },
      });
      await tx.orderStatusEvent.create({
        data: { orderId: record.orderId, status: OrderStatus.REFUNDED, note: `İade ${record.code}` },
      });
    });
  }

  const closeNote = input.refund
    ? input.returnless
      ? "Ürünsüz iade: ödeme gönderildi, stok geri alınmadı."
      : "Kontrol tamamlandı. Satılabilir adet stoka alındı, ödeme iade edildi."
    : "İade reddedildi. Ödeme gönderilmedi, stok girilmedi.";

  await prisma.$transaction(async (tx) => {
    await tx.orderCase.update({
      where: { id: record.id },
      data: {
        status: OrderCaseStatus.COMPLETED,
        completedAt: new Date(),
        rejectReason: input.refund ? record.rejectReason : input.staffNote?.trim().slice(0, 500) || record.rejectReason,
      },
    });
    await appendCaseEvent(tx, record.id, OrderCaseStatus.COMPLETED, closeNote);
  });

  return { ok: true, message: closeNote, caseId: record.id };
}

export async function retryCaseRefund(input: { caseId: string; ip: string }): Promise<OrderCaseActionResult> {
  const record = await prisma.orderCase.findUnique({
    where: { id: input.caseId },
    select: {
      id: true,
      kind: true,
      status: true,
      refundAmountMinor: true,
      returnless: true,
      items: { select: { id: true, condition: true } },
    },
  });
  if (!record) return { ok: false, error: "Kayıt bulunamadı." };
  if (parseOrderCaseStatus(record.status) === "COMPLETED") {
    return { ok: false, error: "Süreç zaten tamamlandı." };
  }

  if (record.kind === OrderCaseKind.CANCEL) {
    return completeCancelCase({ caseId: record.id, ip: input.ip });
  }

  const inspections = record.items.map((item) => ({
    itemId: item.id,
    condition: parseOrderReturnCondition(item.condition),
  }));

  return completeReturnCase({
    caseId: record.id,
    ip: input.ip,
    refund: true,
    returnless: record.returnless,
    inspections,
    amountMinor: record.refundAmountMinor,
  });
}

export function toOrderCaseView(record: {
  id: string;
  code: string;
  kind: string;
  status: string;
  reason: string;
  source: string;
  customerNote: string | null;
  staffNote: string | null;
  rejectReason: string | null;
  refundAmountMinor: number | null;
  returnless: boolean;
  returnCarrierName: string | null;
  returnTrackingNumber: string | null;
  receivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    orderItemId: string;
    quantity: number;
    condition: string;
    restockQuantity: number;
    orderItem: { title: string; variantTitle: string | null };
  }[];
  events: { id: string; status: string; note: string | null; createdAt: Date }[];
}): OrderCaseView {
  return {
    id: record.id,
    code: record.code,
    kind: parseOrderCaseKind(record.kind),
    status: parseOrderCaseStatus(record.status),
    reason: parseOrderCaseReason(record.reason),
    source: record.source === "CUSTOMER" ? "CUSTOMER" : "STAFF",
    customerNote: record.customerNote,
    staffNote: record.staffNote,
    rejectReason: record.rejectReason,
    refundAmountMinor: record.refundAmountMinor,
    returnless: record.returnless,
    returnCarrierName: record.returnCarrierName,
    returnTrackingNumber: record.returnTrackingNumber,
    receivedAt: record.receivedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    items: record.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      title: item.orderItem.title,
      variantTitle: item.orderItem.variantTitle,
      quantity: item.quantity,
      condition: parseOrderReturnCondition(item.condition),
      restockQuantity: item.restockQuantity,
    })),
    events: record.events.map((event) => ({
      id: event.id,
      status: parseOrderCaseStatus(event.status),
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
