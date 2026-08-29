"use client";

import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  createBrandAction,
  updateBrandAction,
  type BrandFormState,
} from "./actions";

const initialState: BrandFormState = {};

type BrandFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  tagline?: string;
  website?: string;
  country?: string;
  logo?: string;
  banner?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  notes?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type BrandFormProps = {
  mode: "create" | "edit";
  initial?: BrandFormValues;
  brandPathPreview?: string;
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

function BrandImageField({
  label,
  fileName,
  preview,
  fileRef,
  previewClassName,
  onPick,
  onClear,
}: {
  label: string;
  fileName: string;
  preview: string;
  fileRef: RefObject<HTMLInputElement | null>;
  previewClassName: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9] ${previewClassName}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain p-2" />
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
                onClick={onClear}
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
            name={fileName}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onPick(file);
            }}
          />
          <p className="text-xs text-slate-400">PNG, JPG veya WEBP. Kayıtta WebP’ye çevrilir.</p>
        </div>
      </div>
    </div>
  );
}

export function BrandForm({ mode, initial, brandPathPreview = "/marka" }: BrandFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createBrandAction : updateBrandAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [logoPreview, setLogoPreview] = useState(initial?.logo ?? "");
  const [banner, setBanner] = useState(initial?.banner ?? "");
  const [bannerPreview, setBannerPreview] = useState(initial?.banner ?? "");
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/products/brands");
      router.refresh();
    }
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="logo" value={logo} />
      <input type="hidden" name="banner" value={banner} />

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
          <h2 className="text-base font-semibold text-slate-800">Marka bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">Vitrinde görünecek ad, slogan ve menşei</p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Marka adı *
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
              placeholder="Örn. Nike"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="tagline" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slogan
            </label>
            <input
              id="tagline"
              name="tagline"
              defaultValue={initial?.tagline ?? ""}
              placeholder="Örn. Just Do It"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-slate-700">
              Menşei ülke
            </label>
            <input
              id="country"
              name="country"
              defaultValue={initial?.country ?? ""}
              placeholder="Örn. ABD"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-slate-700">
              Web sitesi
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={initial?.website ?? ""}
              placeholder="https://ornek.com"
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
              defaultValue={
                mode === "create" && initial?.sortOrder === undefined
                  ? ""
                  : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <AdminSwitch
              name="isActive"
              label="Aktif (vitrinde göster)"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Görseller</h2>
          <p className="mt-1 text-sm text-slate-500">Logo ve marka kapak görseli</p>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <BrandImageField
            label="Logo"
            fileName="logo_file"
            preview={logoPreview}
            fileRef={logoRef}
            previewClassName="h-24 w-36"
            onPick={(file) => setLogoPreview(URL.createObjectURL(file))}
            onClear={() => {
              setLogo("");
              setLogoPreview("");
              if (logoRef.current) logoRef.current.value = "";
            }}
          />
          <BrandImageField
            label="Kapak görseli"
            fileName="banner_file"
            preview={bannerPreview}
            fileRef={bannerRef}
            previewClassName="h-24 w-full max-w-xs"
            onPick={(file) => setBannerPreview(URL.createObjectURL(file))}
            onClear={() => {
              setBanner("");
              setBannerPreview("");
              if (bannerRef.current) bannerRef.current.value = "";
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Marka açıklaması</h2>
          <p className="mt-1 text-sm text-slate-500">Hikâye, tarihçe, ürün yaklaşımı</p>
        </div>
        <div className="p-5">
          <RichTextEditor
            id="description"
            name="description"
            variant="full"
            value={initial?.description ?? ""}
            placeholder="Marka hakkında tanıtım…"
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">SEO</h2>
          <p className="mt-1 text-sm text-slate-500">Marka sayfası URL’si ve arama sonuçları</p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
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
              placeholder="nike"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Boş bırakılırsa addan otomatik üretilir. Ön yüz: {brandPathPreview}/{slug || "…"}
            </p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="seoTitle" className="mb-1.5 block text-sm font-medium text-slate-700">
              SEO başlığı
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              defaultValue={initial?.seoTitle ?? ""}
              maxLength={191}
              placeholder="Sayfa başlığı (title)"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="seoDescription"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              SEO açıklaması
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              maxLength={500}
              defaultValue={initial?.seoDescription ?? ""}
              placeholder="Meta description"
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">İç notlar</h2>
          <p className="mt-1 text-sm text-slate-500">Yalnızca admin panelinde görünür</p>
        </div>
        <div className="p-5">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder="Tedarik kanalı, lisans, iç hatırlatmalar…"
            className={inputClass}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/products/brands"
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
