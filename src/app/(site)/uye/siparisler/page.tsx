import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatOrderDateTime,
  orderPaymentMethodLabel,
  orderStatusBadgeClass,
  orderStatusLabel,
  parseOrderPaymentMethod,
  parseOrderStatus,
} from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";
import { ensureMemberPortalAccess } from "../actions";

export const metadata: Metadata = {
  title: "Sipariş bilgileri",
};

export default async function MemberOrdersPage() {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye/siparisler");
  }

  const orders = await prisma.order.findMany({
    where: { userId: access.session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { id: true, title: true, quantity: true } },
    },
  });

  return (
    <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-site-fg">Siparişlerim</h2>
      <p className="mt-1 text-sm text-site-muted">
        Verdiğiniz siparişlerin durumu ve tutarları.
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-site-muted">Henüz siparişiniz yok.</p>
      ) : (
        <ul className="mt-6 divide-y divide-site-border">
          {orders.map((order) => {
            const status = parseOrderStatus(order.status);
            return (
              <li key={order.id} className="py-4 first:pt-0">
                <Link
                  href={`/uye/siparisler/${order.reference}`}
                  className="block rounded-xl p-1 transition hover:bg-site-surface"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-site-fg">#{order.reference}</p>
                      <p className="mt-1 text-sm text-site-muted">
                        {formatOrderDateTime(order.createdAt.toISOString())}
                        {order.carrierName ? ` · ${order.carrierName}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-site-muted">
                        {order.items
                          .map((item) => `${item.title} × ${item.quantity}`)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusBadgeClass(status)}`}
                      >
                        {orderStatusLabel(status)}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-site-fg">
                        {formatMinorTry(order.totalMinor)}
                      </p>
                      <p className="text-xs text-site-muted">
                        {orderPaymentMethodLabel(parseOrderPaymentMethod(order.paymentMethod))}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
