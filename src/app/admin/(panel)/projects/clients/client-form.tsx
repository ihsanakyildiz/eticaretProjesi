"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import {
  createProjectClientAction,
  updateProjectClientAction,
  type ProjectClientFormState,
} from "./actions";

const initialState: ProjectClientFormState = {};

type ClientFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  sector?: string;
  website?: string;
  description?: string;
  logo?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type ProjectClientFormProps = {
  mode: "create" | "edit";
  initial?: ClientFormValues;
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

export function ProjectClientForm({ mode, initial }: ProjectClientFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createProjectClientAction : updateProjectClientAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [preview, setPreview] = useState(initial?.logo ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/projects/clients");
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
          <h2 className="text-base font-semibold text-slate-800">Müşteri Bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Aynı müşteriye birden fazla proje bağlayabilirsiniz
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Müşteri / Firma Adı *
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
              placeholder="Örn. Acme A.Ş."
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
              placeholder="acme"
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

          <div>
            <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sektör
            </label>
            <input
              id="sector"
              name="sector"
              defaultValue={initial?.sector ?? ""}
              placeholder="Örn. E-ticaret, Sağlık, Fintech"
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

          <div className="flex items-end">
            <AdminSwitch
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Kısa açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder="Müşteri hakkında kısa not (opsiyonel)"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Logo</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
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
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/projects/clients"
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
