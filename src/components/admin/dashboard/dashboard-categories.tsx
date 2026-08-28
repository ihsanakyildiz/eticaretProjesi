import Link from "next/link";
import type { DashboardCategoryBar } from "@/lib/dashboard";

export function DashboardCategories({
  categories,
}: {
  categories: DashboardCategoryBar[];
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Yoğun Kategoriler</h3>
      <p className="mt-1 text-sm text-slate-500">
        En çok içeriğe sahip iş / proje / blog kategorileri
      </p>

      {categories.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          Henüz kategorilere bağlı içerik yok.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {categories.map((category) => (
            <div key={`${category.href}-${category.name}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <Link
                  href={category.href}
                  className="truncate font-medium text-slate-700 hover:text-[#405189]"
                >
                  {category.name}
                </Link>
                <span className="shrink-0 text-slate-400">({category.count})</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f3f6f9]">
                <div
                  className="h-full rounded-full bg-[#0ab39c]"
                  style={{ width: `${category.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
