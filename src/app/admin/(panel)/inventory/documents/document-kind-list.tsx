import Link from "next/link";
import {
  parseStockDocumentKind,
  parseStockDocumentStatus,
  stockDocumentKindLabel,
  stockDocumentStatusLabel,
  type StockDocumentKindCode,
} from "@/lib/inventory-labels";
import { prisma } from "@/lib/prisma";
import { NewStockDocumentButton } from "./new-document-button";

export async function StockDocumentKindList({
  kind,
  description,
}: {
  kind: StockDocumentKindCode;
  description: string;
}) {
  const documents = await prisma.stockDocument.findMany({
    where: { kind },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      warehouse: { select: { name: true, code: true } },
      targetWarehouse: { select: { name: true, code: true } },
      supplier: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              {stockDocumentKindLabel(kind)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
          </div>
          <NewStockDocumentButton kind={kind} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Belge</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Depo</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Satır</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Kayıt yok. Yeni belge oluşturup el terminali ile barkod okutabilirsiniz.
                </td>
              </tr>
            ) : (
              documents.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inventory/documents/${row.id}`}
                      className="font-semibold text-[#405189] hover:underline"
                    >
                      {row.number}
                    </Link>
                    {row.externalNumber ? (
                      <p className="text-xs text-slate-500">{row.externalNumber}</p>
                    ) : null}
                    {row.supplier ? (
                      <p className="text-xs text-slate-500">{row.supplier.name}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.documentDate.toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.warehouse.name}
                    {row.targetWarehouse ? ` → ${row.targetWarehouse.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : row.status === "CANCELED"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {stockDocumentStatusLabel(
                        parseStockDocumentStatus(row.status) ?? "DRAFT",
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row._count.lines}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
