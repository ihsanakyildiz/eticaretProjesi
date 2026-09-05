import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { formatOrderDateTime, orderStatusBadgeClass, orderStatusLabel } from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";
import {
  adminInvoiceListHref,
  loadAdminInvoicePage,
  parseAdminInvoiceListQuery,
} from "@/lib/admin-order-invoices";
import { OrdersSubnav } from "../orders-subnav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Faturalar",
  description: "Sipariş satış faturalarını görüntüleyin ve yazdırın",
};

export default async function OrderInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const list = await loadAdminInvoicePage(parseAdminInvoiceListQuery(params));

  return (
    <div className="space-y-6">
      <OrdersSubnav />

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <FileText className="h-6 w-6 text-[#405189]" />
          Faturalar
          <span className="text-base font-medium text-slate-400">
            ({list.total.toLocaleString("tr-TR")})
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Siparişlerden kesilen satış faturaları. Yeni fatura için sipariş detayında “Fatura
          oluştur” kullanın.
        </p>

        <form action="/admin/orders/invoices" method="get" className="mt-5 flex flex-wrap gap-2">
          <label className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={list.query.q}
              placeholder="Fatura no, sipariş no, referans, müşteri veya vergi no…"
              className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574]"
          >
            Ara
          </button>
          {list.query.q ? (
            <Link
              href="/admin/orders/invoices"
              className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sıfırla
            </Link>
          ) : null}
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Fatura</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Sipariş</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">Tutar</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {list.invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {list.query.q
                    ? "Bu aramaya uygun fatura yok."
                    : "Henüz fatura yok. Bir siparişi açıp Fatura oluşturun."}
                </td>
              </tr>
            ) : (
              list.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${invoice.orderId}/documents/${invoice.id}`}
                      className="font-semibold text-[#405189] hover:underline"
                    >
                      {invoice.documentNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatOrderDateTime(invoice.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${invoice.orderId}`}
                      className="font-medium text-[#405189] hover:underline"
                    >
                      #{invoice.orderNo}
                    </Link>
                    <p className="text-xs text-slate-500">{invoice.reference}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{invoice.customerName}</p>
                    {invoice.company ? (
                      <p className="text-xs text-slate-500">{invoice.company}</p>
                    ) : null}
                    <p className="text-xs text-slate-400">{invoice.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusBadgeClass(invoice.status)}`}
                    >
                      {orderStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatMinorTry(invoice.amountMinor)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${invoice.orderId}/documents/${invoice.id}`}
                      className="text-xs font-medium text-[#405189] hover:underline"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {list.pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Sayfa {list.page} / {list.pageCount}
          </p>
          <div className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={adminInvoiceListHref(list.query, list.page - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 font-medium hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </Link>
            ) : null}
            {list.page < list.pageCount ? (
              <Link
                href={adminInvoiceListHref(list.query, list.page + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 font-medium hover:bg-slate-50"
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
