import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Warehouse } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { WarehousesTable } from "./warehouses-table";

export const metadata: Metadata = {
  title: "Depolar",
  description: "Çoklu depo tanımları",
};

export default async function InventoryWarehousesPage() {
  const [warehouses, stockAggs] = await Promise.all([
    prisma.stockWarehouse.findMany({
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.warehouseStock.groupBy({
      by: ["warehouseId"],
      _sum: { quantity: true },
      _count: { _all: true },
    }),
  ]);
  const aggById = new Map(stockAggs.map((row) => [row.warehouseId, row]));

  const rows = warehouses.map((row) => {
    const agg = aggById.get(row.id);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      city: row.city,
      isActive: row.isActive,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      stockLines: agg?._count._all ?? 0,
      onHand: agg?._sum.quantity ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Warehouse className="h-6 w-6 text-[#405189]" />
              Depolar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              İstanbul, İzmir, Adana veya dilediğiniz kadar lokasyon açın. Stok, irsaliye ve sayım her
              depoya ayrı tutulur. Satış stoğu tüm depoların toplamıdır.
            </p>
          </div>
          <Can resource="inventory" action="create">
            <Link
              href="/admin/inventory/warehouses/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni depo
            </Link>
          </Can>
        </div>
      </div>
      <WarehousesTable warehouses={rows} />
    </div>
  );
}
