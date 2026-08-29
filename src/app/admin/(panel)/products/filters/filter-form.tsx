"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  CategoryCheckboxTree,
  type CategoryCheckboxTreeNode,
} from "@/components/admin/category-checkbox-tree";
import {
  PRODUCT_FILTER_INPUT_TYPES,
  PRODUCT_FILTER_KINDS,
  PRODUCT_FILTER_SYSTEM_KEYS,
  defaultNameForSystemKey,
  defaultSlugForSystemKey,
  inputTypeForSystemKey,
  inputTypeForVariantDisplay,
  productFilterInputTypeHint,
  productFilterInputTypeLabel,
  productFilterKindButtonHint,
  productFilterKindHint,
  productFilterKindLabel,
  productFilterSystemKeyLabel,
  type ProductFilterInputTypeValue,
  type ProductFilterKindValue,
  type ProductFilterSystemKeyValue,
} from "@/lib/product-filters";
import type { ProductAttributeDisplayTypeValue } from "@/lib/product-attributes";
import {
  createProductFilterAction,
  updateProductFilterAction,
  type ProductFilterFormState,
} from "./actions";

const initialState: ProductFilterFormState = {};

export type VariantAttributeOption = {
  id: string;
  name: string;
  slug: string;
  displayType: ProductAttributeDisplayTypeValue;
};

export type BrandFilterPreview = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
};

type FilterFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  kind?: ProductFilterKindValue;
  systemKey?: ProductFilterSystemKeyValue | null;
  variantAttributeId?: string | null;
  inputType?: ProductFilterInputTypeValue;
  unit?: string | null;
  hideEmptyValues?: boolean;
  showProductCount?: boolean;
  appliesGlobally?: boolean;
  inheritToChildren?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  categoryIds?: string[];
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

function looksLikeBrandFilter(name: string, slug: string) {
  const n = name.trim().toLocaleLowerCase("tr-TR");
  const s = slug.trim().toLocaleLowerCase("tr-TR");
  return n === "marka" || n === "markalar" || s === "marka" || s === "markalar" || s === "brand";
}

function SystemBrandPreview({ brands }: { brands: BrandFilterPreview[] }) {
  const preview = brands.slice(0, 10);
  const extra = Math.max(0, brands.length - preview.length);

  return (
    <div className="mt-3 rounded-md border border-[#0ab39c]/30 bg-[#0ab39c]/5 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">
        Kayıtlı markalar otomatik kullanılır
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Yeni değer eklemeniz gerekmez. Marka eklemek veya düzenlemek için{" "}
        <Link href="/admin/products/brands" className="font-medium text-[#405189] hover:underline">
          Markalar
        </Link>{" "}
        sayfasını kullanın.
      </p>
      {brands.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">
          Henüz marka yok. Önce bir marka ekleyin; vitrin filtresi onları otomatik listeler.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {preview.map((brand) => (
            <li
              key={brand.id}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-2.5 py-1.5 text-sm text-slate-700"
            >
              {brand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logo} alt="" className="h-5 w-5 object-contain" />
              ) : null}
              <span>{brand.name}</span>
              {!brand.isActive ? (
                <span className="text-xs text-slate-400">pasif</span>
              ) : null}
            </li>
          ))}
          {extra > 0 ? (
            <li className="inline-flex items-center rounded-md px-2 py-1.5 text-xs text-slate-500">
              +{extra} marka daha
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function ProductFilterForm({
  mode,
  initial,
  categoryTree,
  variantAttributes,
  brands = [],
}: {
  mode: "create" | "edit";
  initial?: FilterFormValues;
  categoryTree: CategoryCheckboxTreeNode[];
  variantAttributes: VariantAttributeOption[];
  brands?: BrandFilterPreview[];
}) {
  const router = useRouter();
  const action = mode === "create" ? createProductFilterAction : updateProductFilterAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [kind, setKind] = useState<ProductFilterKindValue>(initial?.kind ?? "CUSTOM");
  const [systemKey, setSystemKey] = useState<ProductFilterSystemKeyValue>(
    initial?.systemKey ?? "BRAND",
  );
  const [variantAttributeId, setVariantAttributeId] = useState(
    initial?.variantAttributeId ?? variantAttributes[0]?.id ?? "",
  );
  const [inputType, setInputType] = useState<ProductFilterInputTypeValue>(
    initial?.inputType ?? "MULTI_SELECT",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [appliesGlobally, setAppliesGlobally] = useState(
    initial?.appliesGlobally ?? kind === "SYSTEM",
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.redirectId) {
      router.push(`/admin/products/filters/${state.redirectId}/edit`);
      router.refresh();
      return;
    }
    if (mode === "edit") {
      router.refresh();
      return;
    }
    router.push("/admin/products/filters");
    router.refresh();
  }, [state.success, state.redirectId, mode, router]);

  const kindLocked = mode === "edit";
  const selectedVariant = variantAttributes.find((item) => item.id === variantAttributeId);

  const applyKindDefaults = (nextKind: ProductFilterKindValue) => {
    setKind(nextKind);
    if (nextKind === "SYSTEM") {
      setAppliesGlobally(true);
      const key = systemKey;
      const nextName = defaultNameForSystemKey(key);
      setName(nextName);
      if (!slugTouched) setSlug(defaultSlugForSystemKey(key));
      setInputType(inputTypeForSystemKey(key));
      return;
    }
    if (nextKind === "VARIANT") {
      setAppliesGlobally(false);
      const attribute = variantAttributes.find((item) => item.id === variantAttributeId);
      if (attribute) {
        setName(attribute.name);
        if (!slugTouched) setSlug(slugPreview(attribute.slug || attribute.name));
        setInputType(inputTypeForVariantDisplay(attribute.displayType));
      }
      return;
    }
    setAppliesGlobally(false);
    setInputType("MULTI_SELECT");
  };

  const switchToSystemBrand = () => {
    setKind("SYSTEM");
    setSystemKey("BRAND");
    setAppliesGlobally(true);
    setName(defaultNameForSystemKey("BRAND"));
    setSlug(defaultSlugForSystemKey("BRAND"));
    setSlugTouched(true);
    setInputType(inputTypeForSystemKey("BRAND"));
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      {kind === "SYSTEM" ? <input type="hidden" name="systemKey" value={systemKey} /> : null}
      {kind === "VARIANT" ? (
        <input type="hidden" name="variantAttributeId" value={variantAttributeId} />
      ) : null}
      {kind !== "CUSTOM" ? <input type="hidden" name="inputType" value={inputType} /> : null}

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
          <h2 className="text-base font-semibold text-slate-800">Filtre kaynağı</h2>
          <p className="mt-1 text-sm text-slate-500">
            Shopify / Magento kuralı: SKU üreten seçenekler varyant, diğerleri özel özellik, marka
            ve fiyat sistemdir.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">Tür *</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRODUCT_FILTER_KINDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={kindLocked}
                  onClick={() => applyKindDefaults(item)}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${
                    kind === item
                      ? "border-[#0ab39c] bg-[#0ab39c]/10 font-semibold text-slate-800"
                      : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span className="block">{productFilterKindLabel(item)}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    {productFilterKindButtonHint(item)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">{productFilterKindHint(kind)}</p>
            {kind === "CUSTOM" && looksLikeBrandFilter(name, slug) ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {kindLocked ? (
                  <p>
                    Bu kayıt özel özellik olarak açılmış. Markalar tekrar yazılmaz; bu filtreyi
                    silip türü <strong>Sistem → Marka</strong> olarak yeniden ekleyin. Kayıtlı
                    markalar otomatik gelir.
                  </p>
                ) : (
                  <>
                    <p>
                      Markalar zaten{" "}
                      <Link href="/admin/products/brands" className="font-medium underline">
                        Markalar
                      </Link>{" "}
                      sayfasında duruyor. Buraya yeniden yazmayın; türü Sistem yapın.
                    </p>
                    <button
                      type="button"
                      onClick={switchToSystemBrand}
                      className="mt-2 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-amber-300 hover:bg-amber-100"
                    >
                      Sistem → Marka kullan
                    </button>
                  </>
                )}
              </div>
            ) : null}
            {kind === "SYSTEM" && systemKey === "BRAND" ? (
              <SystemBrandPreview brands={brands} />
            ) : null}
          </div>

          {kind === "SYSTEM" && !kindLocked ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Sistem anahtarı *
              </label>
              <select
                value={systemKey}
                onChange={(e) => {
                  const next = e.target.value as ProductFilterSystemKeyValue;
                  setSystemKey(next);
                  setName(defaultNameForSystemKey(next));
                  if (!slugTouched) setSlug(defaultSlugForSystemKey(next));
                  setInputType(inputTypeForSystemKey(next));
                }}
                className={inputClass}
              >
                {PRODUCT_FILTER_SYSTEM_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {productFilterSystemKeyLabel(key)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {kind === "SYSTEM" && kindLocked && initial?.systemKey ? (
            <div className="md:col-span-2 text-sm text-slate-500">
              Sistem: {productFilterSystemKeyLabel(initial.systemKey)}
            </div>
          ) : null}

          {kind === "VARIANT" ? (
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Varyant özelliği *
              </label>
              {kindLocked ? (
                <p className="text-sm text-slate-600">
                  {selectedVariant?.name ?? "Bağlı özellik"}
                  {selectedVariant ? (
                    <>
                      {" "}
                      · vitrin: {productFilterInputTypeLabel(
                        inputTypeForVariantDisplay(selectedVariant.displayType),
                      )}
                    </>
                  ) : null}
                </p>
              ) : variantAttributes.length === 0 ? (
                <p className="text-sm text-rose-600">
                  Kullanılabilir varyant özelliği yok. Önce Varyantlar sayfasından beden/renk ekleyin.
                </p>
              ) : (
                <select
                  value={variantAttributeId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setVariantAttributeId(next);
                    const attribute = variantAttributes.find((item) => item.id === next);
                    if (!attribute) return;
                    setName(attribute.name);
                    if (!slugTouched) setSlug(slugPreview(attribute.slug || attribute.name));
                    setInputType(inputTypeForVariantDisplay(attribute.displayType));
                  }}
                  className={inputClass}
                >
                  {variantAttributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
                </select>
              )}
              {state.fieldErrors?.variantAttributeId ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {state.fieldErrors.variantAttributeId}
                </p>
              ) : null}
            </div>
          ) : null}

          {kind === "CUSTOM" ? (
            <div className="md:col-span-2">
              <label htmlFor="inputType" className="mb-1.5 block text-sm font-medium text-slate-700">
                Vitrin tipi *
              </label>
              <select
                id="inputType"
                name="inputType"
                value={inputType}
                onChange={(e) => setInputType(e.target.value as ProductFilterInputTypeValue)}
                className={inputClass}
              >
                {PRODUCT_FILTER_INPUT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {productFilterInputTypeLabel(type)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                {productFilterInputTypeHint(inputType)}
              </p>
            </div>
          ) : (
            <div className="md:col-span-2 text-sm text-slate-500">
              Vitrin tipi: {productFilterInputTypeLabel(inputType)}
            </div>
          )}

          <div className="md:col-span-2">
            <label htmlFor="filter-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Filtre adı *
            </label>
            <input
              id="filter-name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Malzeme, Beden, Marka"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="filter-slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug (URL)
            </label>
            <input
              id="filter-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="malzeme"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Ön yüz: ?{slug || "slug"}=değer1,değer2
            </p>
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
                mode === "create" && initial?.sortOrder === undefined ? "" : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>

          {inputType === "RANGE" ? (
            <div>
              <label htmlFor="unit" className="mb-1.5 block text-sm font-medium text-slate-700">
                Birim
              </label>
              <input
                id="unit"
                name="unit"
                defaultValue={initial?.unit ?? ""}
                placeholder="cm, GB, ₺"
                className={inputClass}
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              placeholder="Admin notu (opsiyonel)"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
            <AdminSwitch
              name="hideEmptyValues"
              label="Sonucu olmayan değerleri gizle"
              defaultChecked={initial?.hideEmptyValues ?? true}
            />
            <AdminSwitch
              name="showProductCount"
              label="Değer yanında ürün sayısı"
              defaultChecked={initial?.showProductCount ?? true}
            />
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
          <h2 className="text-base font-semibold text-slate-800">Kategori kapsamı</h2>
          <p className="mt-1 text-sm text-slate-500">
            Giyim altındaki beden, elektronik altındaki RAM gibi kategoriye özel fasetler. Alt
            kategoriler ebeveyni miras alır.
          </p>
        </div>
        <div className="space-y-5 p-5">
          <AdminSwitch
            name="appliesGlobally"
            label="Tüm kategorilerde göster (global)"
            checked={appliesGlobally}
            onChange={setAppliesGlobally}
          />
          {!appliesGlobally ? (
            <>
              <AdminSwitch
                name="inheritToChildren"
                label="Seçilen kategorilerin alt kategorilerine de uygula"
                defaultChecked={initial?.inheritToChildren ?? true}
              />
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Kategoriler *</p>
                <CategoryCheckboxTree
                  name="categoryIds"
                  nodes={categoryTree}
                  selectedIds={categoryIds}
                  onChange={setCategoryIds}
                />
                {state.fieldErrors?.categoryIds ? (
                  <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.categoryIds}</p>
                ) : null}
              </div>
            </>
          ) : (
            <input type="hidden" name="inheritToChildren" value="true" />
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/products/filters"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        <button
          type="submit"
          disabled={isPending || (kind === "VARIANT" && variantAttributes.length === 0 && !kindLocked)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kaydet" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
