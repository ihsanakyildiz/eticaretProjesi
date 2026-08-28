"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { LucideIconPicker } from "@/components/admin/lucide-icon-picker";
import {
  createProjectFeatureAction,
  updateProjectFeatureAction,
  type ProjectFeatureFormState,
} from "./actions";

const initialState: ProjectFeatureFormState = {};

const ICON_COLOR_PRESETS = [
  { label: "Mor", value: "#7c3aed" },
  { label: "İndigo", value: "#405189" },
  { label: "Teal", value: "#0ab39c" },
  { label: "Mavi", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Yeşil", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Turuncu", value: "#f97316" },
  { label: "Kırmızı", value: "#ef4444" },
  { label: "Pembe", value: "#ec4899" },
  { label: "Slate", value: "#64748b" },
  { label: "Siyah", value: "#0f172a" },
] as const;

function normalizeHexColor(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const withHash = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, a, b, c] = withHash;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return "";
}

type FeatureFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  sortOrder?: number;
  isActive?: boolean;
  showOnHome?: boolean;
};

type ProjectFeatureFormProps = {
  mode: "create" | "edit";
  initial?: FeatureFormValues;
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

export function ProjectFeatureForm({ mode, initial }: ProjectFeatureFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createProjectFeatureAction : updateProjectFeatureAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [iconColor, setIconColor] = useState(
    () => normalizeHexColor(initial?.iconColor ?? "") || "#7c3aed",
  );

  useEffect(() => {
    if (state.success) {
      router.push("/admin/projects/features");
      router.refresh();
    }
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="iconColor" value={iconColor} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Özellik Bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Projelerde seçilebilecek teknoloji veya özellik (ör. PHP, React, MySQL)
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Özellik Adı *
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. PHP, React, WordPress, MySQL"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug (URL)
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="php"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">Boş bırakılırsa addan otomatik üretilir.</p>
          </div>

          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={
                mode === "create" && initial?.sortOrder === undefined
                  ? ""
                  : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">İkon seçimi</p>
            <LucideIconPicker value={icon} onChange={setIcon} color={iconColor} />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">İkon rengi</p>
            <div className="flex flex-wrap items-center gap-2">
              {ICON_COLOR_PRESETS.map((preset) => {
                const active = iconColor === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={preset.label}
                    onClick={() => setIconColor(preset.value)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      active
                        ? "border-slate-800 ring-2 ring-slate-300 ring-offset-1"
                        : "border-white shadow-sm hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                );
              })}
              <label className="relative ml-1 inline-flex h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-[#e9ebec] shadow-sm">
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                  }}
                />
                <input
                  type="color"
                  value={normalizeHexColor(iconColor) || "#7c3aed"}
                  onChange={(e) => setIconColor(normalizeHexColor(e.target.value))}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Özel renk seç"
                />
              </label>
              <input
                type="text"
                value={iconColor}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (!next) {
                    setIconColor("");
                    return;
                  }
                  const normalized = normalizeHexColor(next);
                  setIconColor(normalized || next);
                }}
                onBlur={() => {
                  const normalized = normalizeHexColor(iconColor);
                  if (normalized) setIconColor(normalized);
                }}
                placeholder="#7c3aed"
                className="w-28 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-sm outline-none focus:border-[#0ab39c]"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Paletten seçin veya özel hex renk yazın / renk seçiciden belirleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 md:col-span-2">
            <AdminSwitch
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
            <AdminSwitch
              name="showOnHome"
              label="Anasayfada göster"
              defaultChecked={initial?.showOnHome ?? false}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder="Bu özelliğin ne anlama geldiğine dair kısa not (opsiyonel)"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/projects/features"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kaydet" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
