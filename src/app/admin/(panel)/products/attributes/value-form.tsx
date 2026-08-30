"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import type { ProductAttributeDisplayTypeValue } from "@/lib/product-attributes";
import {
  createProductAttributeValueAction,
  updateProductAttributeValueAction,
  type ProductAttributeFormState,
} from "./actions";

const initialState: ProductAttributeFormState = {};

export type AttributeValueFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  colorHex?: string | null;
  image?: string | null;
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

export function ProductAttributeValueForm({
  mode,
  attributeId,
  displayType,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  attributeId: string;
  displayType: ProductAttributeDisplayTypeValue;
  initial?: AttributeValueFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const action =
    mode === "create"
      ? createProductAttributeValueAction
      : updateProductAttributeValueAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [preview, setPreview] = useState(initial?.image ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.success) return;
    onSuccess();
  }, [state.success, onSuccess]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  let extraFields: ReactNode = null;
  switch (displayType) {
    case "TEXT":
    case "BUTTON":
      extraFields = null;
      break;
    case "COLOR":
      extraFields = (
        <div className="md:col-span-2">
          <label htmlFor="value-color" className="mb-1.5 block text-sm font-medium text-slate-700">
            Renk kodu
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={colorHex.startsWith("#") && colorHex.length >= 4 ? colorHex : "#000000"}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-[#e9ebec] bg-white p-1"
              aria-label="Renk seçici"
            />
            <input
              id="value-color"
              name="colorHex"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#111827"
              className={inputClass}
            />
          </div>
        </div>
      );
      break;
    case "IMAGE":
      extraFields = (
        <div className="md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Swatch görseli</span>
          <input type="hidden" name="image" value={image} />
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Seç
                </button>
                {preview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImage("");
                      setPreview("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600"
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
            </div>
          </div>
        </div>
      );
      break;
    default: {
      const _exhaustive: never = displayType;
      extraFields = _exhaustive;
      break;
    }
  }

  return (
    <form action={formAction} className="flex flex-col">
      <input type="hidden" name="attributeId" value={attributeId} />
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="value-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Değer *
          </label>
          <input
            id="value-name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugPreview(next));
            }}
            placeholder={displayType === "COLOR" ? "Örn. Siyah" : "Örn. 42"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="value-slug" className="mb-1.5 block text-sm font-medium text-slate-700">
            Slug
          </label>
          <input
            id="value-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="value-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
            Sıra
          </label>
          <input
            id="value-sort"
            name="sortOrder"
            type="number"
            defaultValue={
              mode === "create" && initial?.sortOrder === undefined ? "" : (initial?.sortOrder ?? 0)
            }
            placeholder="Boş = otomatik"
            className={inputClass}
          />
        </div>
        {extraFields}
        <div className="flex items-end">
          <AdminSwitch
            name="isActive"
            label="Aktif"
            defaultChecked={initial?.isActive ?? true}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Değeri Kaydet" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
