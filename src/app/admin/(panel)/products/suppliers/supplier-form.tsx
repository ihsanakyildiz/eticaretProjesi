"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  createSupplierAction,
  updateSupplierAction,
  type SupplierFormState,
} from "./actions";

const initialState: SupplierFormState = {};

type SupplierFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  postalCode?: string;
  logo?: string;
  description?: string;
  productInfo?: string;
  notes?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type SupplierFormProps = {
  mode: "create" | "edit";
  initial?: SupplierFormValues;
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

export function SupplierForm({ mode, initial }: SupplierFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createSupplierAction : updateSupplierAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [preview, setPreview] = useState(initial?.logo ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/products/suppliers");
      router.refresh();
    }
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="logo" value={logo} />

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
          <h2 className="text-base font-semibold text-slate-800">Firma kimliği</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ticari unvan, vergi ve vitrinde görünecek kısa ad
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Firma adı *
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
              placeholder="Örn. Anadolu Tekstil"
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
              placeholder="anadolu-tekstil"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="legalName" className="mb-1.5 block text-sm font-medium text-slate-700">
              Resmi unvan
            </label>
            <input
              id="legalName"
              name="legalName"
              defaultValue={initial?.legalName ?? ""}
              placeholder="Örn. Anadolu Tekstil San. ve Tic. A.Ş."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="taxNumber" className="mb-1.5 block text-sm font-medium text-slate-700">
              Vergi numarası
            </label>
            <input
              id="taxNumber"
              name="taxNumber"
              defaultValue={initial?.taxNumber ?? ""}
              placeholder="10 haneli VKN veya TCKN"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="taxOffice" className="mb-1.5 block text-sm font-medium text-slate-700">
              Vergi dairesi
            </label>
            <input
              id="taxOffice"
              name="taxOffice"
              defaultValue={initial?.taxOffice ?? ""}
              placeholder="Örn. Kadıköy"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-slate-700">
              Yetkili kişi
            </label>
            <input
              id="contactName"
              name="contactName"
              defaultValue={initial?.contactName ?? ""}
              placeholder="Örn. Ayşe Yılmaz"
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
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">İletişim</h2>
          <p className="mt-1 text-sm text-slate-500">Telefon, e-posta, WhatsApp ve web sitesi</p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="siparis@ornek.com"
              className={inputClass}
            />
            {state.fieldErrors?.email ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.email}</p>
            ) : null}
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
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initial?.phone ?? ""}
              placeholder="0212 000 00 00"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone2" className="mb-1.5 block text-sm font-medium text-slate-700">
              İkinci telefon
            </label>
            <input
              id="phone2"
              name="phone2"
              type="tel"
              defaultValue={initial?.phone2 ?? ""}
              placeholder="0555 000 00 00"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-medium text-slate-700">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={initial?.whatsapp ?? ""}
              placeholder="905550000000"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Adres</h2>
          <p className="mt-1 text-sm text-slate-500">Fatura ve sevkiyat adresi</p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
              Açık adres
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={initial?.address ?? ""}
              placeholder="Mahalle, cadde, no, kat"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="district" className="mb-1.5 block text-sm font-medium text-slate-700">
              İlçe
            </label>
            <input
              id="district"
              name="district"
              defaultValue={initial?.district ?? ""}
              placeholder="Örn. Kadıköy"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-slate-700">
              İl
            </label>
            <input
              id="city"
              name="city"
              defaultValue={initial?.city ?? ""}
              placeholder="Örn. İstanbul"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium text-slate-700">
              Posta kodu
            </label>
            <input
              id="postalCode"
              name="postalCode"
              defaultValue={initial?.postalCode ?? ""}
              placeholder="34000"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-slate-700">
              Ülke
            </label>
            <input
              id="country"
              name="country"
              defaultValue={initial?.country ?? ""}
              placeholder="Türkiye"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Logo</h2>
          <p className="mt-1 text-sm text-slate-500">Kayıtta WebP’ye çevrilir</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
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
                  Logo Seç
                </button>
                {preview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLogo("");
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
                name="logo_file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Firma açıklaması</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hakkında, üretim kapasitesi, sertifikalar
          </p>
        </div>
        <div className="p-5">
          <RichTextEditor
            id="description"
            name="description"
            variant="full"
            value={initial?.description ?? ""}
            placeholder="Firma hakkında detaylı tanıtım…"
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Ürün bilgisi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tedarik ettiği ürün grupları, minimum sipariş, teslim süreleri
          </p>
        </div>
        <div className="p-5">
          <RichTextEditor
            id="productInfo"
            name="productInfo"
            variant="full"
            value={initial?.productInfo ?? ""}
            placeholder="Bu firmadan alınan ürünler, şartlar, notlar…"
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">İç notlar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Yalnızca admin panelinde görünür; vitrine çıkmaz
          </p>
        </div>
        <div className="p-5">
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            placeholder="Ödeme vadesi, özel anlaşmalar, iç hatırlatmalar…"
            className={inputClass}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/products/suppliers"
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
