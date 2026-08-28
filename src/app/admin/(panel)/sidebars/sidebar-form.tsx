"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SIDEBAR_LOCATIONS, SIDEBAR_PLACEMENTS } from "@/config/site-sidebars";
import {
  createSidebarAction,
  updateSidebarAction,
  type SidebarFormState,
} from "./actions";

const initialState: SidebarFormState = {};

type SidebarFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  location?: string | null;
  placement?: string;
  sortOrder?: number;
  isActive?: boolean;
};

function slugPreview(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SidebarForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: SidebarFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createSidebarAction : updateSidebarAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.fieldErrors?.redirectId) {
      router.push(`/admin/sidebars/${state.fieldErrors.redirectId}/edit`);
      router.refresh();
      return;
    }
    if (mode === "edit") {
      router.refresh();
    }
  }, [state.success, state.fieldErrors, mode, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.success && mode === "edit" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Sidebar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ad, slug ve sitede gösterileceği konum
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Ad *
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Blog Kenar Çubuğu"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-slate-700">
              Site konumu
            </label>
            <select
              id="location"
              name="location"
              defaultValue={initial?.location ?? ""}
              className={inputClass}
            >
              <option value="">Atanmadı (taslak)</option>
              {SIDEBAR_LOCATIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Her konuma aynı anda yalnızca bir aktif sidebar atanabilir.
            </p>
          </div>
          <div>
            <label htmlFor="placement" className="mb-1.5 block text-sm font-medium text-slate-700">
              Yerleşim *
            </label>
            <select
              id="placement"
              name="placement"
              defaultValue={initial?.placement ?? "LEFT"}
              className={inputClass}
            >
              {SIDEBAR_PLACEMENTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Sidebar’ın içeriğin solunda mı sağında mı görüneceği.
            </p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={initial?.sortOrder ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-1">
            <AdminSwitch
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/admin/sidebars"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Listeye dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>
    </form>
  );
}
