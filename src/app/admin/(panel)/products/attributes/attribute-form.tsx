"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  PRODUCT_ATTRIBUTE_DISPLAY_TYPES,
  productAttributeDisplayHint,
  productAttributeDisplayLabel,
  type ProductAttributeDisplayTypeValue,
} from "@/lib/product-attributes";
import {
  createProductAttributeAction,
  updateProductAttributeAction,
  type ProductAttributeFormState,
} from "./actions";

const initialState: ProductAttributeFormState = {};

type AttributeFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  displayType?: ProductAttributeDisplayTypeValue;
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

export function ProductAttributeForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: AttributeFormValues;
}) {
  const router = useRouter();
  const action =
    mode === "create" ? createProductAttributeAction : updateProductAttributeAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [displayType, setDisplayType] = useState<ProductAttributeDisplayTypeValue>(
    initial?.displayType ?? "TEXT",
  );

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.redirectId) {
      router.push(`/admin/products/attributes/${state.redirectId}/edit`);
      router.refresh();
      return;
    }
    if (mode === "edit") {
      router.refresh();
      return;
    }
    router.push("/admin/products/attributes");
    router.refresh();
  }, [state.success, state.redirectId, mode, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

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
          <h2 className="text-base font-semibold text-slate-800">Varyant özelliği</h2>
          <p className="mt-1 text-sm text-slate-500">
            Beden, renk gibi eksen. Stok bu ekranda tutulmaz; ürün SKU’sunda tutulur.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="attr-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Özellik adı *
            </label>
            <input
              id="attr-name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Beden, Renk, Numara"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="attr-slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              id="attr-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="beden"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="attr-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="attr-sort"
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
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Vitrin görünümü *
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRODUCT_ATTRIBUTE_DISPLAY_TYPES.map((type) => {
                const selected = displayType === type;
                const radioId = `display-${type}`;
                return (
                  <label
                    key={type}
                    htmlFor={radioId}
                    className={`cursor-pointer rounded-md border px-3 py-3 text-sm ${
                      selected
                        ? "border-[#0ab39c] bg-[#0ab39c]/5"
                        : "border-[#e9ebec] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      id={radioId}
                      type="radio"
                      name="displayType"
                      value={type}
                      checked={selected}
                      onChange={() => setDisplayType(type)}
                      className="sr-only"
                    />
                    <span className="block font-medium text-slate-800">
                      {productAttributeDisplayLabel(type)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {productAttributeDisplayHint(type)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="attr-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Açıklama
            </label>
            <textarea
              id="attr-description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              placeholder="Admin notu (ör. EU ayakkabı numarası)"
              className={`${inputClass} resize-y`}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/products/attributes"
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
          {mode === "create" ? "Kaydet ve değer ekle" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
