"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import {
  parseOrderCaseReason,
  parseOrderReturnCondition,
  type OrderCaseKindCode,
} from "@/lib/order-cases";
import {
  approveReturnCase,
  completeCancelCase,
  completeReturnCase,
  createOrderCase,
  receiveReturnCase,
  rejectOrderCase,
  retryCaseRefund,
} from "@/lib/order-case-workflow";
import { parseMajorToMinor } from "@/lib/product-money";
import { getClientIp } from "@/lib/request-ip";
import { prisma } from "@/lib/prisma";

function revalidateCase(orderId: string, reference?: string | null) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/uye/siparisler");
  if (reference) revalidatePath(`/uye/siparisler/${reference}`);
}

async function revalidateByCaseId(caseId: string) {
  const record = await prisma.orderCase.findUnique({
    where: { id: caseId },
    select: { orderId: true, order: { select: { reference: true } } },
  });
  if (record) revalidateCase(record.orderId, record.order.reference);
}

export async function createOrderCaseAction(input: {
  orderId: string;
  kind: OrderCaseKindCode;
  reason: string;
  note?: string;
  items?: { orderItemId: string; quantity: number }[];
}) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };

  const result = await createOrderCase({
    orderId: input.orderId,
    kind: input.kind,
    reason: parseOrderCaseReason(input.reason),
    source: "STAFF",
    staffNote: input.note,
    items: input.items,
    ip: await getClientIp(),
    autoCompleteCancel: input.kind === "CANCEL",
    autoApproveReturn: input.kind === "RETURN",
  });
  if (!result.ok) return { error: result.error };
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { reference: true },
  });
  revalidateCase(input.orderId, order?.reference);
  return { success: true, message: result.message };
}

export async function rejectOrderCaseAction(input: { caseId: string; rejectReason: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await rejectOrderCase(input);
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}

export async function approveReturnCaseAction(input: { caseId: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await approveReturnCase(input);
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}

export async function receiveReturnCaseAction(input: {
  caseId: string;
  carrierName?: string;
  trackingNumber?: string;
}) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await receiveReturnCase(input);
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}

export async function completeReturnCaseAction(input: {
  caseId: string;
  refund: boolean;
  returnless?: boolean;
  amount?: string;
  staffNote?: string;
  inspections?: { itemId: string; condition: string }[];
}) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const amountMinor = input.amount?.trim() ? parseMajorToMinor(input.amount) : null;
  if (input.refund && input.amount?.trim() && (amountMinor === null || amountMinor < 0)) {
    return { error: "Geçerli bir iade tutarı girin." };
  }
  const result = await completeReturnCase({
    caseId: input.caseId,
    ip: await getClientIp(),
    refund: input.refund,
    returnless: input.returnless,
    amountMinor,
    staffNote: input.staffNote,
    inspections: input.inspections?.map((row) => ({
      itemId: row.itemId,
      condition: parseOrderReturnCondition(row.condition),
    })),
  });
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}

export async function completeCancelCaseAction(input: { caseId: string; staffNote?: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await completeCancelCase({
    caseId: input.caseId,
    ip: await getClientIp(),
    staffNote: input.staffNote,
  });
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}

export async function retryCaseRefundAction(input: { caseId: string }) {
  const gate = await requirePermission("orders", "update");
  if (!gate.ok) return { error: gate.error };
  const result = await retryCaseRefund({ caseId: input.caseId, ip: await getClientIp() });
  if (!result.ok) return { error: result.error };
  await revalidateByCaseId(input.caseId);
  return { success: true, message: result.message };
}
