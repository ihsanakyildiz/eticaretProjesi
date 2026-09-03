import type { Metadata } from "next";
import Link from "next/link";
import { stockMovementKindLabel } from "@/lib/inventory-labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Stok hareketleri" };

type MovementsPageProps = {
  searchParams: Promise<{ warehouse?: string; q?: string }>;
};

export default async function InventoryMovementsPage({ searchParams }: MovementsPageProps) {
  const params = await searchParams;
  const warehouseId = (params.warehouse ?? "").trim();
  const q = (params.q ?? "").trim();

  const warehouses = await prisma.stockWarehouse.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, code: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      ...(q
        ? {
            OR: [
              { note: { contains: q } },
              { variant: { sku: { contains: q } } },
              { variant: { barcode: { contains: q } } },
              { variant: { product: { title: { contains: q } } } },
              { document: { number: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      warehouse: { select: { name: true, code: true } },
      variant: {
        select: { sku: true, barcode: true, title: true, product: { select: { title: true } } },
      },
      document: { select: { id: true, number: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Stok hareketleri</h1>
        <p className="mt-2 text-sm text-slate-500">
          Giriş, çıkış, transfer, satış rezervasyonu ve katalog güncellemelerinin denetim kaydı.
        </p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Ürün, belge no, barkod"
            className="min-w-0 flex-1 rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          />
          <select
            name="warehouse"
            defaultValue={warehouseId}
            className="rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          >
            <option value="">Tüm depolar</option>
            {warehouses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Filtrele
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Tür</th>
              <th className="px-4 py-3">Depo</th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3 text-right">Adet</th>
              <th className="px-4 py-3 text-right">Bakiye</th>
              <th className="px-4 py-3">Belge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Hareket yok.
                </td>
              </tr>
            ) : (
              movements.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {row.createdAt.toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">{stockMovementKindLabel(row.kind)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.warehouse.name}{" "}
                    <span className="font-mono text-xs">({row.warehouse.code})</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{row.variant.product.title}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {row.variant.sku}
                      {row.variant.barcode ? ` · ${row.variant.barcode}` : ""}
                    </p>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      row.quantity < 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.balanceAfter}</td>
                  <td className="px-4 py-3">
                    {row.document ? (
                      <Link
                        href={`/admin/inventory/documents/${row.document.id}`}
                        className="font-medium text-[#405189] hover:underline"
                      >
                        {row.document.number}
                      </Link>
                    ) : (
                      <span className="text-slate-400">{row.note ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
