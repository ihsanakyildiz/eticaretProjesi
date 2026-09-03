"use server";

import { revalidatePath } from "next/cache";
import { ensureMemberPortalAccess } from "../actions";
import {
  canOpenCancelCase,
  caseKindForOrderStatus,
  parseOrderCaseReason,
} from "@/lib/order-cases";
import { parseOrderStatus } from "@/lib/orders";
import { createOrderCase } from "@/lib/order-case-workflow";
import { getClientIp } from "@/lib/request-ip";
import { prisma } from "@/lib/prisma";

export type MemberCaseFormState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function requestMemberOrderCaseAction(
  _prev: MemberCaseFormState,
  formData: FormData,
): Promise<MemberCaseFormState> {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) return { error: "Oturum bulunamadı." };

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { error: "Sipariş bulunamadı." };

  const order = await prisma.order.findFirst({
    where: { reference, userId: access.session.user.id },
    select: { id: true, reference: true, status: true },
  });
  if (!order) return { error: "Sipariş bulunamadı." };

  const status = parseOrderStatus(order.status);
  const kind = caseKindForOrderStatus(status);
  if (!kind) return { error: "Bu sipariş için iptal veya iade açılamaz." };

  const selectedIds = new Set(formData.getAll("returnItem").map(String));
  if (kind === "RETURN" && selectedIds.size === 0) {
    return { error: "En az bir ürün seçin." };
  }

  const items =
    kind === "RETURN"
      ? [...selectedIds].map((orderItemId) => ({
          orderItemId,
          quantity: Math.max(1, Math.floor(Number(formData.get(`qty-${orderItemId}`)) || 0)),
        }))
      : undefined;

  const result = await createOrderCase({
    orderId: order.id,
    kind,
    reason: parseOrderCaseReason(String(formData.get("reason") ?? "")),
    source: "CUSTOMER",
    customerNote: String(formData.get("note") ?? "").trim() || null,
    items,
    ip: await getClientIp(),
    autoCompleteCancel: kind === "CANCEL" && canOpenCancelCase(status),
    autoApproveReturn: false,
  });

  revalidatePath("/uye/siparisler");
  revalidatePath(`/uye/siparisler/${order.reference}`);
  revalidatePath(`/admin/orders/${order.id}`);

  if (!result.ok) return { error: result.error };
  return { success: true, message: result.message };
}
