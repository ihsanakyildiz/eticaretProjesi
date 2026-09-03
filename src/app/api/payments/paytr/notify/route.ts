import { NextResponse } from "next/server";
import { acceptCardPayment, markOrderPaymentError } from "@/lib/order-payments";
import { getPaytrCredentials, verifyPaytrNotifyHash } from "@/lib/paytr";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const merchantOid = String(form.get("merchant_oid") ?? "").trim();
  const status = String(form.get("status") ?? "").trim();
  const totalAmount = String(form.get("total_amount") ?? "").trim();
  const hash = String(form.get("hash") ?? "").trim();

  const settings = await getSettingsMapUncached();
  const creds = getPaytrCredentials(settings);
  if (!creds) {
    return new NextResponse("PayTR tanımlı değil", { status: 500 });
  }

  const valid = verifyPaytrNotifyHash({
    merchantOid,
    status,
    totalAmount,
    hash,
    merchantKey: creds.merchantKey,
    merchantSalt: creds.merchantSalt,
  });
  if (!valid) {
    return new NextResponse("PAYTR notification failed: bad hash", { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { reference: merchantOid },
    select: { id: true, totalMinor: true, paymentProvider: true },
  });
  if (!order || order.paymentProvider !== "paytr") {
    return new NextResponse("OK");
  }

  if (status !== "success") {
    await markOrderPaymentError(order.id, String(form.get("failed_reason_msg") ?? "PayTR ödeme başarısız"));
    return new NextResponse("OK");
  }

  const charged = Number.parseInt(totalAmount, 10);
  if (!Number.isFinite(charged) || charged < order.totalMinor) {
    await markOrderPaymentError(order.id, "PayTR tutar uyuşmazlığı");
    return new NextResponse("OK");
  }

  await acceptCardPayment({
    orderId: order.id,
    transactionId: merchantOid,
    expectedMinor: order.totalMinor,
  });

  return new NextResponse("OK");
}
