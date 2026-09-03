import Link from "next/link";
import type { DuplicateBarcodeGroup } from "@/lib/product-barcode";

export function DuplicateBarcodesTable({ groups }: { groups: DuplicateBarcodeGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-[#e9ebec] bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
        Eşleşen tekrarlayan barkod yok.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="divide-y divide-[#e9ebec]">
        {groups.map((group) => (
          <section key={group.barcode} className="px-4 py-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-base font-semibold text-slate-800">{group.barcode}</p>
              <p className="text-xs font-medium text-amber-700">{group.count} varyant</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="py-1 pr-3">Ürün</th>
                  <th className="py-1 pr-3">Varyant</th>
                  <th className="py-1 pr-3">SKU</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {group.variants.map((variant) => (
                  <tr key={variant.id} className="border-t border-[#e9ebec]">
                    <td className="py-2 pr-3 text-slate-800">{variant.productTitle}</td>
                    <td className="py-2 pr-3 text-slate-600">{variant.title || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">{variant.sku}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/admin/products/${variant.productId}/edit?tab=variants`}
                        className="text-xs font-semibold text-[#405189] hover:underline"
                      >
                        Düzelt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
