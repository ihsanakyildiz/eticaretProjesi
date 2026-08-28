"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { deleteHeroSlideAction, toggleHeroSlideActiveAction } from "./actions";

export type SlideRow = {
  id: string;
  label: string | null;
  headline: string;
  isActive: boolean;
  sortOrder: number;
  layout: string;
  _count: { media: number };
};

export function HeroSlidesPanel({
  heroId,
  slides,
}: {
  heroId: string;
  slides: SlideRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Slaytlar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bu hero alanında sırayla gösterilecek slaytlar
          </p>
        </div>
        <Link
          href={`/admin/heroes/${heroId}/slides/new`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          <Plus className="h-4 w-4" />
          Yeni Slayt
        </Link>
      </div>

      {slides.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          Henüz slayt yok. İlk slaytı ekleyerek başlayın.
        </div>
      ) : (
        <div className="divide-y divide-[#e9ebec]">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {slide.label || slide.headline}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {slide.headline} · {slide._count.media} medya · sıra {slide.sortOrder}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {slide.isActive ? (
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
                <form action={toggleHeroSlideActiveAction}>
                  <input type="hidden" name="id" value={slide.id} />
                  <button
                    type="submit"
                    title={slide.isActive ? "Pasife al" : "Aktif et"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c]"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </form>
                <Link
                  href={`/admin/heroes/${heroId}/slides/${slide.id}/edit`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  disabled={isPending && pendingId === slide.id}
                  onClick={() => {
                    if (!confirm("Bu slayt silinsin mi?")) return;
                    const formData = new FormData();
                    formData.set("id", slide.id);
                    setPendingId(slide.id);
                    startTransition(async () => {
                      await deleteHeroSlideAction(formData);
                      setPendingId(null);
                      router.refresh();
                    });
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                >
                  {isPending && pendingId === slide.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
