"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Columns3,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { deleteSidebarAction, toggleSidebarActiveAction } from "./actions";

export type SidebarRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  locationLabel: string;
  placement: string;
  placementLabel: string;
  isActive: boolean;
  sortOrder: number;
  _count: { widgets: number };
};

export function SidebarsTable({ sidebars }: { sidebars: SidebarRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<SidebarRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return sidebars;
    return sidebars.filter(
      (item) =>
        item.name.toLocaleLowerCase("tr-TR").includes(q) ||
        item.slug.toLocaleLowerCase("tr-TR").includes(q) ||
        item.locationLabel.toLocaleLowerCase("tr-TR").includes(q),
    );
  }, [sidebars, query]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteSidebarAction(deleteTarget.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const toggleActive = (id: string) => {
    setTogglingId(id);
    startTransition(async () => {
      try {
        await toggleSidebarActiveAction(id);
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "Durum güncellenemedi.",
        );
      } finally {
        setTogglingId(null);
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="border-b border-[#e9ebec] px-4 py-3">
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sidebar ara…"
            className="w-full rounded-md border border-[#e9ebec] bg-[#f8f9fb] py-2.5 pr-3 pl-9 text-sm outline-none focus:border-[#0ab39c] focus:bg-white focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Columns3 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Sidebar yok</p>
          <p className="mt-1 text-xs text-slate-400">
            İlk kenar çubuğunuzu oluşturarak başlayın.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8f9fb] text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Ad</th>
                <th className="px-4 py-3 font-semibold">Konum</th>
                <th className="px-4 py-3 font-semibold">Yerleşim</th>
                <th className="px-4 py-3 font-semibold">Widget</th>
                <th className="px-4 py-3 font-semibold">Durum</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f2]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.locationLabel}</td>
                  <td className="px-4 py-3 text-slate-600">{item.placementLabel}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {item._count.widgets}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/sidebars/${item.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#405189]"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        disabled={pending && togglingId === item.id}
                        onClick={() => toggleActive(item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                        title="Aktif/pasif"
                      >
                        {pending && togglingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(item);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Kapat"
            disabled={pending}
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-[#e9ebec] bg-white shadow-xl">
            <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800">Sidebar’ı sil</h2>
                <p className="mt-1 text-sm text-slate-500">
                  <strong>{deleteTarget.name}</strong> ve tüm widget’ları silinecek.
                </p>
              </div>
              <button type="button" onClick={() => setDeleteTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            {deleteError ? (
              <p className="px-5 pt-3 text-sm text-rose-600">{deleteError}</p>
            ) : null}
            <div className="flex justify-end gap-2 px-5 py-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
