"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  createWorkCategoryAction,
  updateWorkCategoryAction,
  type WorkCategoryFormState,
} from "./actions";

const initialState: WorkCategoryFormState = {};

type CategoryFormValues = {
  id?: string;
  parentId?: string | null;
  name?: string;
  slug?: string;
  description?: string;
  content?: string;
  icon?: string;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type ParentOption = {
  id: string;
  label: string;
  depth: number;
};

type WorkCategoryFormProps = {
  mode: "create" | "edit";
  initial?: CategoryFormValues;
  parentOptions?: ParentOption[];
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

export function WorkCategoryForm({ mode, initial, parentOptions = [] }: WorkCategoryFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createWorkCategoryAction : updateWorkCategoryAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [preview, setPreview] = useState(initial?.image ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/works/categories");
      router.refresh();
    }
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="image" value={image} />

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
          <h2 className="text-base font-semibold text-slate-800">Temel Bilgiler</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hizmet kategorisinin adı, kısa açıklaması ve yayın durumu
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="parentId" className="mb-1.5 block text-sm font-medium text-slate-700">
              Üst Kategori
            </label>
            <SearchableSelect
              id="parentId"
              name="parentId"
              value={parentId}
              onChange={setParentId}
              options={parentOptions}
              placeholder="Üst kategori ara veya seçin…"
              emptyLabel="— Ana kategori (üst yok) —"
              searchPlaceholder="Kategori veya alt kategori ara…"
              noResultsLabel="Eşleşen kategori bulunamadı"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Yazarak arayın; alt kategori için bir üst seçin. Seviye sınırı yoktur.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kategori Adı *
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
              placeholder="Örn. Web Tasarım"
              className={inputClass}
            />
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
              placeholder="web-tasarim"
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
            <p className="mt-1.5 text-xs text-slate-400">
              Boş bırakılırsa aynı seviyedeki son sıranın ardına eklenir.
            </p>
          </div>

          <div>
            <label htmlFor="icon" className="mb-1.5 block text-sm font-medium text-slate-700">
              İkon (opsiyonel)
            </label>
            <input
              id="icon"
              name="icon"
              defaultValue={initial?.icon ?? ""}
              placeholder="Örn. monitor, code, palette"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <AdminSwitch
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa Açıklama
            </label>
            <RichTextEditor
              id="description"
              name="description"
              variant="compact"
              value={initial?.description ?? ""}
              placeholder="Kartlarda görünecek kısa hizmet açıklaması"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-slate-700">
              Detay İçerik
            </label>
            <RichTextEditor
              id="content"
              name="content"
              variant="full"
              value={initial?.content ?? ""}
              placeholder="Hizmet kategorisinin detaylı açıklaması, sunulan hizmetler vb."
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Görsel</h2>
          <p className="mt-1 text-sm text-slate-500">Kategori kapak görseli (otomatik WebP)</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Görsel Seç
                </button>
                {preview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImage("");
                      setPreview("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Kaldır
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                name="image_file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPreview(URL.createObjectURL(file));
                }}
              />
              <p className="text-xs text-slate-400">PNG, JPG veya WEBP — kayıtta WebP’ye çevrilir.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">SEO</h2>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="seoTitle" className="mb-1.5 block text-sm font-medium text-slate-700">
              SEO Başlığı
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              defaultValue={initial?.seoTitle ?? ""}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="seoDescription"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              SEO Açıklaması
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              defaultValue={initial?.seoDescription ?? ""}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/works/categories"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kategoriyi Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
