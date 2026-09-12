"use client";

import { TrendingUp } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import {
  saveCategoryPlacementAction,
  saveGlobalBoostAction,
  saveSearchPlacementAction,
} from "./actions";
import type { RankingScope } from "@/lib/product-ranking";

export type RankingProductRow = {
  id: string;
  title: string;
  sku: string | null;
  image: string | null;
  categoryName: string | null;
  viewCount: number;
  clickCount: number;
  rankScore: number;
  boost: number;
};

function actionForScope(scope: RankingScope) {
  switch (scope) {
    case "category":
      return saveCategoryPlacementAction;
    case "search":
      return saveSearchPlacementAction;
    case "global":
      return saveGlobalBoostAction;
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

export function RankingTable({
  scope,
  categoryId,
  term,
  rows,
}: {
  scope: RankingScope;
  categoryId?: string;
  term?: string;
  rows: RankingProductRow[];
}) {
  const action = actionForScope(scope);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
        {scope === "category"
          ? "Kategori seçin; o kategorideki ürünler burada listelenir."
          : scope === "search"
            ? "En az 2 karakterlik bir arama terimi yazın."
            : "Ürün bulunamadı."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3">
        <p className="text-xs font-medium text-slate-500">{rows.length} ürün</p>
        <p className="inline-flex items-center gap-1 text-xs text-slate-400">
          <TrendingUp className="h-3.5 w-3.5" />
          Puan yükseldikçe vitrinde yukarı çıkar
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[minmax(0,1.6fr)_90px_90px_110px_160px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <div>Ürün</div>
            <div>Tıklama</div>
            <div>Görüntüleme</div>
            <div>Organik skor</div>
            <div className="text-right">Vitrin puanı</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(0,1.6fr)_90px_90px_110px_160px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-[#e9ebec] bg-slate-50">
                  {row.image ? (
                    <img src={row.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{row.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {[row.sku, row.categoryName].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="text-slate-600">{row.clickCount}</div>
              <div className="text-slate-600">{row.viewCount}</div>
              <div className="font-medium text-slate-700">{row.rankScore}</div>
              <div className="flex justify-end">
                <Can resource="settings_ranking" action="update">
                  <form action={action} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={row.id} />
                    {scope === "category" ? (
                      <input type="hidden" name="categoryId" value={categoryId ?? ""} />
                    ) : null}
                    {scope === "search" ? (
                      <input type="hidden" name="term" value={term ?? ""} />
                    ) : null}
                    <input
                      name="boost"
                      type="number"
                      defaultValue={row.boost}
                      min={0}
                      max={99999}
                      className="w-20 rounded-md border border-[#e9ebec] px-2 py-1.5 text-sm outline-none focus:border-[#0ab39c]"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-[#e9ebec] px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Kaydet
                    </button>
                  </form>
                </Can>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
