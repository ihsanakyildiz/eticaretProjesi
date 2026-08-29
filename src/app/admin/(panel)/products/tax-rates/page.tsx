import type { Metadata } from "next";
import Link from "next/link";
import { Percent, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { TaxRatesTable } from "./tax-rates-table";

export const metadata: Metadata = {
  title: "KDV Oranları",
  description: "Ürün fiyatlandırmasında kullanılacak KDV oranlarını yönetin",
};

export default async function TaxRatesPage() {
  const rates = await prisma.taxRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { percent: "asc" }],
    select: {
      id: true,
      name: true,
      percent: true,
      isDefault: true,
      isActive: true,
      sortOrder: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Percent className="h-6 w-6 text-[#405189]" />
              KDV Oranları
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Burada tanımlanan oranlar, ürün fiyatlandırmasında KDV seçim listesine düşer.
            </p>
          </div>
          <Can resource="tax_rates" action="create">
            <Link
              href="/admin/products/tax-rates/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni KDV Oranı
            </Link>
          </Can>
        </div>
      </div>

      <TaxRatesTable rates={rates} />
    </div>
  );
}
