import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { locationHint } from "@/lib/inventory-locations";
import { prisma } from "@/lib/prisma";
import { StockLocationSelect } from "./stock-location-select";

export const metadata: Metadata = { title: "Stok durumu" };

type StockPageProps = {
  searchParams: Promise<{ q?: string; warehouse?: string; stock?: string; page?: string }>;
};

const PAGE_SIZE = 40;

export default async function InventoryStockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const warehouseId = (params.warehouse ?? "").trim();
  const stockFilter = params.stock ?? "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const warehouses = await prisma.stockWarehouse.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  const where = {
    trackInventory: true,
    ...(q
      ? {
          OR: [
            { sku: { contains: q } },
            { barcode: { contains: q } },
            { title: { contains: q } },
            { product: { title: { contains: q } } },
          ],
        }
      : {}),
    ...(stockFilter === "zero" ? { stockQuantity: { lte: 0 } } : {}),
    ...(stockFilter === "low" ? { stockQuantity: { gt: 0, lte: 5 } } : {}),
    ...(warehouseId
      ? {
          warehouseStocks: {
            some: { warehouseId, ...(stockFilter === "zero" ? { quantity: { lte: 0 } } : {}) },
          },
        }
      : {}),
  };

  const [total, variants, locations, missingLocationCount] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      orderBy: [{ product: { title: "asc" } }, { sortOrder: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        barcode: true,
        title: true,
        stockQuantity: true,
        product: { select: { id: true, title: true } },
        warehouseStocks: {
          select: {
            warehouseId: true,
            quantity: true,
            locationId: true,
            location: { select: { id: true, code: true, aisle: true, rack: true, shelf: true } },
          },
        },
      },
    }),
    warehouseId
      ? prisma.stockLocation.findMany({
          where: { warehouseId, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: { id: true, code: true, aisle: true, rack: true, shelf: true },
        })
      : Promise.resolve([]),
    warehouseId
      ? prisma.warehouseStock.count({
          where: { warehouseId, quantity: { gt: 0 }, locationId: null },
        })
      : Promise.resolve(0),
  ]);
  const locationOptions = locations.map((row) => ({
    id: row.id,
    code: row.code,
    hint: locationHint(row),
  }));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (next: Record<string, string>) => {
    const sp = new URLSearchParams();
    const merged = {
      q,
      warehouse: warehouseId,
      stock: stockFilter,
      page: String(page),
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "all" && !(key === "page" && value === "1")) sp.set(key, value);
    }
    const s = sp.toString();
    return s ? `/admin/inventory?${s}` : "/admin/inventory";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Boxes className="h-6 w-6 text-[#405189]" />
          Stok durumu
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Satış stoğu tüm depoların toplamıdır. Raf kodu ürünün depo içindeki yeridir; sipariş
          paketlemede çalışan bu adrese gider. Raf atamak için bir depo seçin.
        </p>
        {warehouseId && missingLocationCount > 0 ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Bu depoda stoğu olan {missingLocationCount} üründe raf yok. Aşağıdan raf seçin; depo çalışanı
            siparişte ürünü ancak o zaman bulur.
          </p>
        ) : null}
        <form className="mt-4 flex flex-col gap-3 lg:flex-row" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Ürün, SKU, barkod"
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
          <select
            name="stock"
            defaultValue={stockFilter}
            className="rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm"
          >
            <option value="all">Tüm stoklar</option>
            <option value="low">Kritik (1–5)</option>
            <option value="zero">Tükendi</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574]"
          >
            Filtrele
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Barkod</th>
              {warehouses.map((row) => (
                <th key={row.id} className="px-4 py-3 text-right">
                  {row.code}
                </th>
              ))}
              {warehouseId ? <th className="px-4 py-3">Raf</th> : null}
              <th className="px-4 py-3 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={4 + warehouses.length + (warehouseId ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              variants.map((row) => {
                const byWh = new Map(row.warehouseStocks.map((item) => [item.warehouseId, item]));
                const selectedStock = warehouseId ? (byWh.get(warehouseId) ?? null) : null;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${row.product.id}/edit`}
                        className="font-medium text-slate-800 hover:text-[#405189]"
                      >
                        {row.product.title}
                      </Link>
                      {row.title ? <p className="text-xs text-slate-500">{row.title}</p> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.barcode ?? "—"}</td>
                    {warehouses.map((warehouse) => {
                      const stock = byWh.get(warehouse.id);
                      const qty = stock?.quantity ?? 0;
                      return (
                        <td
                          key={warehouse.id}
                          className={`px-4 py-3 text-right tabular-nums ${qty <= 0 ? "text-rose-600" : "text-slate-700"}`}
                        >
                          <div>{qty}</div>
                          {!warehouseId && stock?.location ? (
                            <div className="font-mono text-[10px] font-medium text-[#405189]">
                              {stock.location.code}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                    {warehouseId ? (
                      <td className="px-4 py-3">
                        <StockLocationSelect
                          warehouseId={warehouseId}
                          variantId={row.id}
                          locationId={selectedStock?.locationId ?? null}
                          locations={locationOptions}
                          compact
                        />
                      </td>
                    ) : null}
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        row.stockQuantity <= 0 ? "text-rose-600" : "text-slate-800"
                      }`}
                    >
                      {row.stockQuantity}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {total} kayıt · sayfa {page}/{pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={qs({ page: String(page - 1) })} className="rounded-md border px-3 py-1.5">
                Önceki
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link href={qs({ page: String(page + 1) })} className="rounded-md border px-3 py-1.5">
                Sonraki
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
