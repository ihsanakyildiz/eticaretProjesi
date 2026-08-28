"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Images,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { deleteHeroAction, toggleHeroActiveAction } from "./actions";

export type HeroRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  autoplay: boolean;
  intervalMs: number;
  _count: { slides: number };
};

function DeleteHeroModal({
  hero,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  hero: HeroRow;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        disabled={isPending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">Hero alanını sil</h2>
            <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-md p-1 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">{hero.name}</strong> alanını ve tüm
            slaytlarını silmek istediğinize emin misiniz?
          </p>
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export function HeroesTable({ heroes }: { heroes: HeroRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HeroRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return heroes;
    return heroes.filter((hero) =>
      [hero.name, hero.slug, hero.description ?? ""].join(" ").toLocaleLowerCase("tr-TR").includes(needle),
    );
  }, [heroes, query]);

  if (heroes.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz hero alanı yok.</p>
        <Link
          href="/admin/heroes/new"
          className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          İlk Hero Alanını Ekle
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <label htmlFor="heroes-search" className="mb-1.5 block text-xs font-medium text-slate-500">
          Arama
        </label>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="heroes-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad veya slug ara…"
            className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3 text-xs font-medium text-slate-500">
          {filtered.length} / {heroes.length} hero alanı
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Sonuç yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_80px_70px_90px_140px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <div>Hero</div>
                <div>Slug</div>
                <div>Slayt</div>
                <div>Sıra</div>
                <div>Durum</div>
                <div className="text-right">İşlemler</div>
              </div>
              {filtered.map((hero) => (
                <div
                  key={hero.id}
                  className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_80px_70px_90px_140px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{hero.name}</p>
                    {hero.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{hero.description}</p>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-slate-500">/{hero.slug}</div>
                  <div className="inline-flex items-center gap-1 text-slate-600">
                    <Images className="h-3.5 w-3.5 text-slate-400" />
                    {hero._count.slides}
                  </div>
                  <div className="text-slate-600">{hero.sortOrder}</div>
                  <div>
                    {hero.isActive ? (
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
                    <form action={toggleHeroActiveAction}>
                      <input type="hidden" name="id" value={hero.id} />
                      <button
                        type="submit"
                        title={hero.isActive ? "Pasife al" : "Aktif et"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </form>
                    <Link
                      href={`/admin/heroes/${hero.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(hero);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeleteHeroModal
          hero={deleteTarget}
          isPending={isPending}
          error={deleteError}
          onClose={() => {
            if (!isPending) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
          onConfirm={() => {
            const formData = new FormData();
            formData.set("id", deleteTarget.id);
            startTransition(async () => {
              const result = await deleteHeroAction(formData);
              if (result.error) {
                setDeleteError(result.error);
                return;
              }
              setDeleteTarget(null);
              router.refresh();
            });
          }}
        />
      ) : null}
    </>
  );
}
