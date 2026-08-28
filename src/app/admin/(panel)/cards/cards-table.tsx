"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { LucideIconByName } from "@/lib/lucide-icons";
import { deleteCardAction, toggleCardActiveAction } from "./actions";

export type CardRow = {
  id: string;
  type: "CLASSIC" | "ADVANCED";
  title: string;
  mediaType: "IMAGE" | "ICON";
  image: string | null;
  icon: string | null;
  href: string;
  isActive: boolean;
  sortOrder: number;
};

function DeleteCardModal({
  card,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  card: CardRow;
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
            <h2 className="text-base font-semibold text-slate-800">Kartı sil</h2>
            <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-md p-1 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">{card.title}</strong> kartını silmek
            istediğinize emin misiniz?
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

export function CardsTable({ cards }: { cards: CardRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CardRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return cards;
    return cards.filter((card) =>
      [card.title, card.href, card.icon ?? "", card.type]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(needle),
    );
  }, [cards, query]);

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz kart yok.</p>
        <Link
          href="/admin/cards/new"
          className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          İlk Kartı Ekle
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <label htmlFor="cards-search" className="mb-1.5 block text-xs font-medium text-slate-500">
          Arama
        </label>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="cards-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Başlık, link veya ikon ara…"
            className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3 text-xs font-medium text-slate-500">
          {filtered.length} / {cards.length} kart
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Sonuç yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_100px_minmax(0,1.1fr)_70px_90px_140px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <div>Kart</div>
                <div>Tip</div>
                <div>Link</div>
                <div>Sıra</div>
                <div>Durum</div>
                <div className="text-right">İşlemler</div>
              </div>
              {filtered.map((card) => (
                <div
                  key={card.id}
                  className="grid grid-cols-[minmax(0,1.6fr)_100px_minmax(0,1.1fr)_70px_90px_140px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9] text-[#405189]">
                      {(card.type === "ADVANCED" || card.mediaType === "IMAGE") &&
                      card.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <LucideIconByName name={card.icon ?? undefined} className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{card.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {card.type === "ADVANCED"
                          ? "Split yerleşim"
                          : card.mediaType === "IMAGE"
                            ? "Görsel"
                            : `İkon · ${card.icon ?? "—"}`}
                      </p>
                    </div>
                  </div>
                  <div>
                    {card.type === "ADVANCED" ? (
                      <span className="inline-flex rounded-full bg-[#405189]/10 px-2.5 py-1 text-[11px] font-semibold text-[#405189]">
                        Gelişmiş
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#0ab39c]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0ab39c]">
                        Klasik
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {card.type === "ADVANCED" ? "—" : card.href}
                  </div>
                  <div className="text-slate-600">{card.sortOrder}</div>
                  <div>
                    {card.isActive ? (
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
                    <form action={toggleCardActiveAction}>
                      <input type="hidden" name="id" value={card.id} />
                      <button
                        type="submit"
                        title={card.isActive ? "Pasife al" : "Aktif et"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </form>
                    <Link
                      href={`/admin/cards/${card.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(card);
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
        <DeleteCardModal
          card={deleteTarget}
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
              const result = await deleteCardAction(formData);
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
