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
import {
  deleteProjectFeatureAction,
  toggleProjectFeatureActiveAction,
} from "./actions";
import { LucideIconByName } from "@/lib/lucide-icons";

export type ProjectFeatureRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  iconColor: string | null;
  isActive: boolean;
  showOnHome: boolean;
  sortOrder: number;
  _count: { projects: number };
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function DeleteFeatureModal({
  feature,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  feature: ProjectFeatureRow;
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
            <h2 className="text-base font-semibold text-slate-800">Özelliği sil</h2>
            <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">{feature.name}</strong> özelliğini silmek
            istediğinize emin misiniz?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Özellik kalıcı olarak silinecek.</li>
            {feature._count.projects > 0 ? (
              <li>
                {feature._count.projects} projeden bu özellik bağlantısı kaldırılacak.
              </li>
            ) : null}
          </ul>
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
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectFeaturesTable({ features }: { features: ProjectFeatureRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectFeatureRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return features;
    return features.filter((feature) => {
      const haystack = normalizeSearch(
        [feature.name, feature.slug, feature.description ?? "", feature.icon ?? ""].join(" "),
      );
      return haystack.includes(q);
    });
  }, [features, search]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProjectFeatureAction({ id: deleteTarget.id });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const toggleActive = (feature: ProjectFeatureRow) => {
    startTransition(async () => {
      const result = await toggleProjectFeatureActiveAction({
        id: feature.id,
        isActive: !feature.isActive,
      });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Özellik ara…"
              className="w-full rounded-md border border-[#e9ebec] bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
            />
          </div>
          <p className="text-xs text-slate-400">
            {filtered.length} / {features.length} özellik
          </p>
        </div>

        {actionError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-slate-500">
              {features.length === 0
                ? "Henüz özellik eklenmemiş."
                : "Aramanızla eşleşen özellik yok."}
            </p>
            {features.length === 0 ? (
              <Link
                href="/admin/projects/features/new"
                className="mt-4 inline-flex text-sm font-medium text-[#405189] hover:underline"
              >
                İlk özelliği ekle →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_70px_90px_90px_150px] gap-2 border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <span>Özellik</span>
                <span>Slug</span>
                <span>Sıra</span>
                <span>Proje</span>
                <span>Durum</span>
                <span className="text-right">İşlem</span>
              </div>

              {filtered.map((feature) => (
                <div
                  key={feature.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_70px_90px_90px_150px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {feature.icon ? (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f3f6f9]"
                        style={{ color: feature.iconColor || "#405189" }}
                      >
                        <LucideIconByName name={feature.icon} className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{feature.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {feature.showOnHome ? (
                          <span className="inline-flex rounded bg-[#405189]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#405189]">
                            Anasayfa
                          </span>
                        ) : null}
                        {feature.description ? (
                          <p className="truncate text-xs text-slate-400">{feature.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="truncate text-slate-500">{feature.slug}</span>
                  <span className="text-slate-500">{feature.sortOrder}</span>
                  <span className="text-slate-500">{feature._count.projects}</span>
                  <span>
                    {feature.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#0ab39c]/10 px-2 py-0.5 text-xs font-semibold text-[#0ab39c]">
                        <Check className="h-3 w-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        Pasif
                      </span>
                    )}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/projects/features/${feature.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189]"
                      title="Düzenle"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleActive(feature)}
                      disabled={isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#0ab39c] disabled:opacity-60"
                      title={feature.isActive ? "Pasife al" : "Aktif et"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setDeleteTarget(feature);
                      }}
                      disabled={isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeleteFeatureModal
          feature={deleteTarget}
          isPending={isPending}
          error={actionError}
          onClose={() => {
            if (isPending) return;
            setDeleteTarget(null);
            setActionError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
