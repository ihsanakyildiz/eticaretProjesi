"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2, Plus, Power, Search, Trash2, X } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import {
  createSearchTermAction,
  deleteSearchTermAction,
  toggleSearchTermActiveAction,
  updateSearchTermScoreAction,
  type SearchTermFormState,
} from "./actions";

export type SearchTermRow = {
  id: string;
  displayTerm: string;
  term: string;
  score: number;
  searchCount: number;
  isActive: boolean;
  updatedAt: string;
};

const initialCreate: SearchTermFormState = {};

export function SearchTermsTable({ terms }: { terms: SearchTermRow[] }) {
  const [query, setQuery] = useState("");
  const [state, formAction, isPending] = useActionState(
    createSearchTermAction,
    initialCreate,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return terms;
    return terms.filter((term) =>
      `${term.displayTerm} ${term.term}`.toLocaleLowerCase("tr-TR").includes(needle),
    );
  }, [query, terms]);

  return (
    <div className="space-y-4">
      <Can resource="settings_search" action="create">
        <form
          action={formAction}
          className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-800">Yeni arama terimi</p>
          <p className="mt-1 text-xs text-slate-500">
            Puanı yüksek terimler öneri penceresinde üstte çıkar. Müşteri aramaları da
            otomatik sayılır; buradan skor vererek öne çıkarabilirsiniz.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <input
              name="displayTerm"
              required
              minLength={2}
              placeholder="Örn. gram altın"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
            <input
              name="score"
              type="number"
              defaultValue={10}
              min={-9999}
              max={99999}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ekle
            </button>
          </div>
          {state.error ? (
            <p className="mt-2 text-sm text-rose-600">{state.error}</p>
          ) : null}
        </form>
      </Can>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3">
          <p className="text-xs font-medium text-slate-500">
            {filtered.length} / {terms.length} terim
          </p>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Terim ara…"
              className="w-full rounded-md border border-[#e9ebec] bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Henüz arama terimi yok. Müşteriler aradıkça otomatik oluşur veya yukarıdan ekleyin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_110px_110px_90px_140px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <div>Terim</div>
                <div>Puan</div>
                <div>Arama sayısı</div>
                <div>Durum</div>
                <div className="text-right">İşlemler</div>
              </div>
              {filtered.map((term) => (
                <div
                  key={term.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_110px_110px_90px_140px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{term.displayTerm}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{term.term}</p>
                  </div>
                  <div>
                    <Can resource="settings_search" action="update">
                      <form action={updateSearchTermScoreAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={term.id} />
                        <input
                          name="score"
                          type="number"
                          defaultValue={term.score}
                          min={-9999}
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
                  <div className="text-slate-600">{term.searchCount}</div>
                  <div>
                    {term.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                        <X className="h-3.5 w-3.5" />
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Can resource="settings_search" action="update">
                      <form action={toggleSearchTermActiveAction}>
                        <input type="hidden" name="id" value={term.id} />
                        <button
                          type="submit"
                          title={term.isActive ? "Pasife al" : "Aktif et"}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </form>
                    </Can>
                    <Can resource="settings_search" action="delete">
                      <form action={deleteSearchTermAction}>
                        <input type="hidden" name="id" value={term.id} />
                        <button
                          type="submit"
                          title="Sil"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
