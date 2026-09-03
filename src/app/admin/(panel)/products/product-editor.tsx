"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  ParentCategoryTreePicker,
  type ParentCategoryTreeNode,
} from "@/components/admin/parent-category-tree";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  filterAppliesToCategory,
  type FilterCategoryScope,
} from "@/lib/product-filters";
import type { CategoryNodeBase } from "@/lib/category-tree";
import {
  MAX_GENERATED_COMBINATIONS,
  buildCombinationsFromValueGroups,
  makeSkuCandidate,
  pruneIncompleteCombinations,
  type CombinationValue,
} from "@/lib/product-combinations";
import {
  PRODUCT_EDITOR_TABS,
  PRODUCT_ESTIMATED_DELIVERIES,
  PRODUCT_OUT_OF_STOCK_BEHAVIORS,
  PRODUCT_SALE_UNITS,
  PRODUCT_VISIBILITIES,
  productEditorTabLabel,
  isProductEditorTabId,
  productEstimatedDeliveryLabel,
  productSaleUnitLabel,
  productVisibilityLabel,
  serializeProductVariants,
  type ProductEditorTabId,
  type ProductFeatureDraft,
  type ProductVariantDraft,
} from "@/lib/product-editor";
import {
  formatMinorToMajorInput,
  fromChargeAndListPrice,
  marginMinor,
  marginRatePercent,
  parseMajorToMinor,
  taxExcludedMinor,
  taxIncludedMinor,
  toChargeAndListPrice,
} from "@/lib/product-money";
import { isRealCombination } from "@/lib/product-combination-filters";
import { DEFAULT_VARIANT_COMBINATION_KEY } from "@/lib/product-variants";
import { slugify } from "@/lib/slug";
import { DEFAULT_URL_STRUCTURE, publicProductHref, type UrlStructure } from "@/lib/url-structure";
import {
  createProductAction,
  duplicateProductAction,
  updateProductAction,
  type ProductFormState,
} from "./actions";
import {
  GenerateCombinationsModal,
  type GeneratorAttribute,
} from "./generate-combinations-modal";
import { ProductGalleryEditor, type ProductGalleryItem } from "./product-gallery-editor";
import { VariantCombinationsPanel } from "./variant-combinations-panel";
import { CatalogStockHint, catalogStockInputClass } from "./catalog-stock-field";

const initialState: ProductFormState = {};

export type ProductEditorBrand = { id: string; name: string };
export type ProductEditorSupplier = { id: string; name: string };
export type ProductEditorTaxRate = {
  id: string;
  name: string;
  percent: number;
  isDefault: boolean;
};
export type ProductEditorFilter = {
  id: string;
  name: string;
  inputType: "MULTI_SELECT" | "SWATCH" | "BOOLEAN" | "RANGE";
  kind: "CUSTOM" | "VARIANT" | "SYSTEM";
  appliesGlobally: boolean;
  inheritToChildren: boolean;
  assignedCategoryIds: string[];
  unit: string | null;
  values: Array<{ id: string; name: string }>;
};

type AttachmentItem = {
  key: string;
  id?: string;
  url?: string;
  name: string;
  file?: File;
};

export type ProductEditorRelatedCandidate = {
  id: string;
  title: string;
  sku: string | null;
};

export type ProductEditorInitial = {
  id?: string;
  title?: string;
  slug?: string;
  urlId?: number;
  summary?: string;
  content?: string;
  isActive?: boolean;
  sortOrder?: number;
  categoryId?: string | null;
  brandId?: string | null;
  supplierId?: string | null;
  sku?: string | null;
  mpn?: string | null;
  upc?: string | null;
  gtin?: string | null;
  isbn?: string | null;
  basePriceMinor?: number;
  compareAtMinor?: number | null;
  costMinor?: number | null;
  taxRatePercent?: number;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  weightKg?: number | null;
  extraShippingMinor?: number;
  estimatedDelivery?: "SAME_DAY" | "DAYS_1_3" | "DAYS_3_5" | "DAYS_5_10" | null;
  visibility?: "EVERYWHERE" | "CATALOG" | "SEARCH" | "NONE";
  availableForOrder?: boolean;
  showPrice?: boolean;
  onlineOnly?: boolean;
  onSale?: boolean;
  outOfStockBehavior?: "DENY" | "ALLOW" | "DEFAULT";
  inStockLabel?: string | null;
  outOfStockLabel?: string | null;
  saleUnit?: "PIECE" | "KG" | "METER" | "LITER" | "PACK";
  minOrderQty?: number;
  quantityStep?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: Array<{ id: string; url: string; alt?: string | null; isCover: boolean }>;
  attachments?: Array<{ id: string; url: string; name: string }>;
  relatedIds?: string[];
  features?: ProductFeatureDraft[];
  variants?: ProductVariantDraft[];
};

function slugPreview(value: string) {
  return slugify(value);
}

function newClientKey() {
  return `v-${Math.random().toString(36).slice(2, 10)}`;
}

function initialTaxRatePercent(rates: ProductEditorTaxRate[], initial?: number) {
  if (initial != null && Number.isFinite(initial)) return String(initial);
  const preferred = rates.find((rate) => rate.isDefault) ?? rates[0];
  return preferred ? String(preferred.percent) : "";
}

function emptyDefaultVariant(priceMinor: number, sku: string): ProductVariantDraft {
  return {
    clientKey: "default",
    sku: sku || "SKU",
    title: "Varsayılan",
    priceMinor,
    stockQuantity: 0,
    isDefault: true,
    isActive: true,
    combinationKey: DEFAULT_VARIANT_COMBINATION_KEY,
    selections: [],
  };
}

export function ProductEditor({
  mode,
  initial,
  categoryTree,
  categoryCatalog,
  brands,
  suppliers,
  attributes,
  customFilters,
  taxRates,
  relatedCandidates = [],
  urlStructure = DEFAULT_URL_STRUCTURE,
  advancedInventory = false,
}: {
  mode: "create" | "edit";
  initial?: ProductEditorInitial;
  categoryTree: ParentCategoryTreeNode[];
  categoryCatalog: CategoryNodeBase[];
  brands: ProductEditorBrand[];
  suppliers: ProductEditorSupplier[];
  attributes: GeneratorAttribute[];
  customFilters: ProductEditorFilter[];
  taxRates: ProductEditorTaxRate[];
  relatedCandidates: ProductEditorRelatedCandidate[];
  urlStructure?: UrlStructure;
  advancedInventory?: boolean;
}) {
  const router = useRouter();
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const saveIntentRef = useRef<"draft" | "publish">("draft");
  const [tab, setTab] = useState<ProductEditorTabId>("description");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const isActive = initial?.isActive ?? true;
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const initialListPrice = fromChargeAndListPrice(
    initial?.basePriceMinor ?? 0,
    initial?.compareAtMinor,
  );
  const [salePriceMajor, setSalePriceMajor] = useState(
    formatMinorToMajorInput(initialListPrice.saleMinor),
  );
  const [discountPriceMajor, setDiscountPriceMajor] = useState(
    initialListPrice.discountMinor != null
      ? formatMinorToMajorInput(initialListPrice.discountMinor)
      : "",
  );
  const [costMajor, setCostMajor] = useState(
    initial?.costMinor != null ? formatMinorToMajorInput(initial.costMinor) : "",
  );
  const [taxRatePercent, setTaxRatePercent] = useState(
    initialTaxRatePercent(taxRates, initial?.taxRatePercent),
  );
  const [priceIncludesTax, setPriceIncludesTax] = useState(false);
  const [gallery, setGallery] = useState<ProductGalleryItem[]>(() =>
    (initial?.images ?? []).map((image, index) => ({
      key: image.id,
      id: image.id,
      url: image.url,
      preview: image.url,
      isCover: image.isCover || index === 0,
      alt: image.alt ?? "",
    })),
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>(() =>
    (initial?.attachments ?? []).map((row) => ({
      key: row.id,
      id: row.id,
      url: row.url,
      name: row.name,
    })),
  );
  const [relatedIds, setRelatedIds] = useState<string[]>(initial?.relatedIds ?? []);
  const [relatedPickId, setRelatedPickId] = useState("");
  const [saleUnit, setSaleUnit] = useState(initial?.saleUnit ?? "PIECE");
  const [minOrderQty, setMinOrderQty] = useState(String(initial?.minOrderQty ?? 1));
  const [quantityStep, setQuantityStep] = useState(String(initial?.quantityStep ?? 1));
  const [features, setFeatures] = useState<ProductFeatureDraft[]>(initial?.features ?? []);
  const [variants, setVariants] = useState<ProductVariantDraft[]>(
    () =>
      initial?.variants?.length
        ? initial.variants
        : [emptyDefaultVariant(initial?.basePriceMinor ?? 0, initial?.sku ?? "")],
  );
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [featureFilterId, setFeatureFilterId] = useState("");
  const [featureValueId, setFeatureValueId] = useState("");
  const [featureBoolean, setFeatureBoolean] = useState<"true" | "false">("true");
  const [featureNumber, setFeatureNumber] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const attachmentFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && isProductEditorTabId(requested)) setTab(requested);
  }, []);

  const hasCombinations = variants.some(
    (item) => item.combinationKey !== DEFAULT_VARIANT_COMBINATION_KEY,
  );
  const defaultVariant = variants.find(
    (item) => item.combinationKey === DEFAULT_VARIANT_COMBINATION_KEY,
  );
  const totalStock = variants.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);
  const taxPercent = Number.parseInt(taxRatePercent, 10) || 0;
  const typedPriceMinor = parseMajorToMinor(salePriceMajor) ?? 0;
  const saleExclMinor = priceIncludesTax
    ? taxExcludedMinor(typedPriceMinor, taxPercent)
    : typedPriceMinor;
  const typedDiscountMinor = parseMajorToMinor(discountPriceMajor);
  const discountExclMinor =
    typedDiscountMinor == null
      ? null
      : priceIncludesTax
        ? taxExcludedMinor(typedDiscountMinor, taxPercent)
        : typedDiscountMinor;
  const storedPrice = toChargeAndListPrice(saleExclMinor, discountExclMinor);
  const basePriceMinor = storedPrice.chargeMinor;
  const compareAtMinor = storedPrice.listMinor;
  const priceIncl = taxIncludedMinor(basePriceMinor, taxPercent);
  const saleIncl = priceIncludesTax ? typedPriceMinor : taxIncludedMinor(saleExclMinor, taxPercent);
  const costMinor = parseMajorToMinor(costMajor) ?? 0;
  const cover = gallery.find((item) => item.isCover) ?? gallery[0];
  const taxRateOptions = useMemo(() => {
    const current = Number.parseInt(taxRatePercent, 10);
    if (!Number.isFinite(current) || taxRates.some((rate) => rate.percent === current)) {
      return taxRates;
    }
    return [
      {
        id: `legacy-${current}`,
        name: `KDV %${current}`,
        percent: current,
        isDefault: false,
      },
      ...taxRates,
    ];
  }, [taxRatePercent, taxRates]);

  const submitWithGallery = (formData: FormData) => {
    formData.set("saveIntent", saveIntentRef.current);
    formData.delete("gallery_files");
    formData.delete("attachment_files");
    for (const item of gallery) {
      if (item.file) formData.append("gallery_files", item.file);
    }
    for (const item of attachments) {
      if (item.file) formData.append("attachment_files", item.file);
    }
    const syncedVariants = hasCombinations
      ? variants
      : variants.map((item) =>
          item.combinationKey === DEFAULT_VARIANT_COMBINATION_KEY
            ? {
                ...item,
                sku: sku.trim() || item.sku,
                priceMinor: basePriceMinor,
                compareAtMinor: compareAtMinor,
                isDefault: true,
              }
            : item,
        );
    formData.set("variantsJson", JSON.stringify(serializeProductVariants(syncedVariants)));
    for (const item of syncedVariants) {
      if (item.imageFile) {
        formData.append(`variant_image_${item.clientKey}`, item.imageFile);
      }
    }
    formData.set("basePriceMajor", formatMinorToMajorInput(basePriceMinor));
    formData.set("compareAtMajor", compareAtMinor != null ? formatMinorToMajorInput(compareAtMinor) : "");
    formData.set("relatedIdsJson", JSON.stringify(relatedIds));
    formAction(formData);
  };

  const captureSaveIntent = (event: FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const value = submitter?.value;
    if (value === "draft" || value === "publish") {
      saveIntentRef.current = value;
    }
  };

  const applicableFilters = useMemo(() => {
    return customFilters.filter((filter) =>
      filterAppliesToCategory(
        categoryCatalog,
        {
          appliesGlobally: filter.appliesGlobally,
          inheritToChildren: filter.inheritToChildren,
          assignedCategoryIds: filter.assignedCategoryIds,
        } satisfies FilterCategoryScope,
        categoryId || null,
      ),
    );
  }, [customFilters, categoryCatalog, categoryId]);

  const selectedFeatureFilter = applicableFilters.find((item) => item.id === featureFilterId);

  useEffect(() => {
    if (!state.success) return;
    if (mode === "create" && state.redirectId) {
      router.push(`/admin/products/${state.redirectId}/edit`);
      router.refresh();
      return;
    }
    router.refresh();
  }, [state.success, state.redirectId, mode, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  const setSimpleStock = (raw: string) => {
    if (advancedInventory) return;
    const stockQuantity = Math.max(0, Math.round(Number(raw) || 0));
    setVariants((prev) =>
      prev.map((item) =>
        item.combinationKey === DEFAULT_VARIANT_COMBINATION_KEY ? { ...item, stockQuantity } : item,
      ),
    );
  };

  const syncSimpleVariantPrice = (saleExcl: number, discountExcl: number | null) => {
    if (hasCombinations) return;
    const next = toChargeAndListPrice(saleExcl, discountExcl);
    setVariants((prev) =>
      prev.map((item) =>
        item.combinationKey === DEFAULT_VARIANT_COMBINATION_KEY
          ? { ...item, priceMinor: next.chargeMinor, compareAtMinor: next.listMinor }
          : item,
      ),
    );
  };

  const saleTypedToExcl = (typedMinor: number, includesTax: boolean, tax: number) =>
    includesTax ? taxExcludedMinor(typedMinor, tax) : typedMinor;

  const applyTypedPrices = (
    saleTypedMinor: number,
    discountTypedMinor: number | null,
    includesTax: boolean,
    tax: number,
  ) => {
    const saleExcl = saleTypedToExcl(saleTypedMinor, includesTax, tax);
    const discountExcl =
      discountTypedMinor == null ? null : saleTypedToExcl(discountTypedMinor, includesTax, tax);
    syncSimpleVariantPrice(saleExcl, discountExcl);
  };

  const applyGenerated = (groups: CombinationValue[][]) => {
    const built = buildCombinationsFromValueGroups(groups);
    if (built.length > MAX_GENERATED_COMBINATIONS) return;
    setVariants((prev) => {
      const real = prev.filter(isRealCombination);
      const byKey = new Map(real.map((item) => [item.combinationKey, item]));
      const merged = [...real];
      const room = Math.max(0, MAX_GENERATED_COMBINATIONS - real.length);
      let added = 0;
      for (const row of built) {
        if (added >= room) break;
        if (byKey.has(row.combinationKey)) continue;
        const suffix = row.title.replace(/\s+/g, "-");
        const draft: ProductVariantDraft = {
          clientKey: newClientKey(),
          sku: makeSkuCandidate(sku || slugPreview(title) || "SKU", suffix),
          title: row.title,
          priceMinor: basePriceMinor,
          compareAtMinor,
          stockQuantity: 0,
          isDefault: false,
          isActive: true,
          combinationKey: row.combinationKey,
          selections: row.selections,
        };
        byKey.set(row.combinationKey, draft);
        merged.push(draft);
        added += 1;
      }
      const next = pruneIncompleteCombinations(merged);
      if (!next.some((item) => item.isDefault)) {
        const priced = next.find((item) => item.priceMinor > 0) ?? next[0];
        if (priced) priced.isDefault = true;
      }
      return next.length ? next : prev;
    });
    setGeneratorOpen(false);
  };

  const imagesJson = JSON.stringify(
    gallery.map((item, index) => ({
      id: item.id,
      url: item.url,
      isCover: item.isCover,
      sortOrder: index,
      alt: item.alt,
      hasFile: Boolean(item.file),
    })),
  );
  const attachmentsJson = JSON.stringify(
    attachments.map((item, index) => ({
      id: item.id,
      url: item.url,
      name: item.name,
      sortOrder: index,
      hasFile: Boolean(item.file),
    })),
  );

  return (
    <form action={submitWithGallery} onSubmit={captureSaveIntent} className="space-y-4 pb-8">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="featuresJson" value={JSON.stringify(features)} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(serializeProductVariants(variants))} />
      <input type="hidden" name="imagesJson" value={imagesJson} />
      <input type="hidden" name="attachmentsJson" value={attachmentsJson} />
      <input type="hidden" name="relatedIdsJson" value={JSON.stringify(relatedIds)} />

      {state.error ? (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.success && mode === "edit" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message ?? "Kaydedildi."}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <label htmlFor="product-title" className="text-sm font-medium text-slate-700">
              Ürün adı *
            </label>
            <input
              id="product-title"
              name="title"
              required
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. Hummingbird baskılı tişört"
              className={`${inputClass} text-lg font-semibold`}
            />
            <p className="text-xs text-slate-500">
              {hasCombinations ? "Kombinasyonlu ürün" : "Standart ürün"} ·{" "}
              {isActive ? "Çevrimiçi" : "Taslak"}
            </p>
          </div>
          <div className="grid shrink-0 gap-1 text-sm text-slate-600 sm:text-right">
            <p className="font-medium text-slate-800">
              {formatMinorToMajorInput(basePriceMinor)} ₺{" "}
              <span className="font-normal text-slate-500">KDV hariç</span>
            </p>
            <p>
              {formatMinorToMajorInput(priceIncl)} ₺ KDV dahil
              {taxPercent ? ` (${taxPercent}%)` : ""}
            </p>
            <p>
              <span className="inline-flex rounded-md bg-[#0ab39c]/10 px-2 py-0.5 text-xs font-semibold text-[#0ab39c]">
                {totalStock} stokta
              </span>
            </p>
            <p className="text-xs text-slate-400">Referans: {sku || "—"}</p>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex min-w-max gap-1 px-2">
          {PRODUCT_EDITOR_TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-3 text-sm whitespace-nowrap ${
                tab === id
                  ? "border-slate-800 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {productEditorTabLabel(id)}
            </button>
          ))}
        </div>
      </div>

      <div className={tab === "description" ? "space-y-6" : "hidden"}>
          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Görseller</h2>
              <p className="mt-1 text-sm text-slate-500">İlk kapak görseli listelerde kullanılır</p>
            </div>
            <div className="p-5">
              <ProductGalleryEditor items={gallery} onChange={setGallery} />
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Özet</h2>
            </div>
            <div className="p-5">
              <RichTextEditor
                id="summary"
                name="summary"
                variant="compact"
                value={initial?.summary ?? ""}
                placeholder="Liste ve paylaşım kartlarında görünecek kısa özet"
              />
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Açıklama</h2>
            </div>
            <div className="p-5">
              <RichTextEditor
                id="content"
                name="content"
                variant="full"
                value={initial?.content ?? ""}
                placeholder="Ürün detay sayfası içeriği"
              />
            </div>
          </section>
          {!hasCombinations ? (
            <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
              <div className="border-b border-[#e9ebec] px-5 py-4">
                <h2 className="text-base font-semibold text-slate-800">Stok</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {advancedInventory
                    ? "Gelişmiş stok sistemi açık. Adet, ürün kartından değiştirilemez."
                    : "Kombinasyonu olmayan ürünlerde stok varsayılan SKU üzerindedir."}
                </p>
              </div>
              <div className="p-5">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Stok adedi</label>
                <input
                  type="number"
                  min={0}
                  readOnly={advancedInventory}
                  value={defaultVariant?.stockQuantity ?? 0}
                  onChange={(event) => setSimpleStock(event.target.value)}
                  className={catalogStockInputClass(`${inputClass} max-w-xs`, advancedInventory)}
                />
                <CatalogStockHint locked={advancedInventory} />
              </div>
            </section>
          ) : null}
        </div>

      <div className={tab === "details" ? "space-y-6" : "hidden"}>
          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Sınıflandırma</h2>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="mb-1.5 text-sm font-medium text-slate-700">Kategori *</p>
                <ParentCategoryTreePicker
                  name="categoryId"
                  value={categoryId}
                  onChange={setCategoryId}
                  nodes={categoryTree}
                  allowEmpty={false}
                />
                {state.fieldErrors?.categoryId ? (
                  <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.categoryId}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">Vitrinde listelenmesi için kategori zorunludur.</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Marka</label>
                <SearchableSelect
                  name="brandId"
                  value={brandId}
                  onChange={setBrandId}
                  options={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
                  placeholder="Marka seçin"
                  emptyLabel="Seçilmedi"
                  searchPlaceholder="Marka ara…"
                  noResultsLabel="Eşleşen marka yok"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tedarikçi</label>
                <SearchableSelect
                  name="supplierId"
                  value={supplierId}
                  onChange={setSupplierId}
                  options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.name }))}
                  placeholder="Tedarikçi seçin"
                  emptyLabel="Seçilmedi"
                  searchPlaceholder="Tedarikçi ara…"
                  noResultsLabel="Eşleşen tedarikçi yok"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Referanslar</h2>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Referans / SKU</label>
                <input name="sku" value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">MPN</label>
                <input name="mpn" defaultValue={initial?.mpn ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">UPC barkodu</label>
                <input name="upc" defaultValue={initial?.upc ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">GTIN / EAN</label>
                <input name="gtin" defaultValue={initial?.gtin ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ISBN</label>
                <input name="isbn" defaultValue={initial?.isbn ?? ""} className={inputClass} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Özellikler</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kategoriye bağlı özel filtreler (malzeme, yaka tipi…). Marka ve beden burada yazılmaz.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchableSelect
                  value={featureFilterId}
                  onChange={(next) => {
                    setFeatureFilterId(next);
                    setFeatureValueId("");
                  }}
                  options={applicableFilters.map((filter) => ({
                    id: filter.id,
                    label: filter.name,
                  }))}
                  placeholder="Bir özellik seçin"
                  emptyLabel="Bir özellik seçin"
                  searchPlaceholder="Özellik ara…"
                  noResultsLabel="Eşleşen özellik yok"
                  className="min-w-0 flex-1"
                />
                {selectedFeatureFilter &&
                (selectedFeatureFilter.inputType === "MULTI_SELECT" ||
                  selectedFeatureFilter.inputType === "SWATCH") ? (
                  <SearchableSelect
                    value={featureValueId}
                    onChange={setFeatureValueId}
                    options={selectedFeatureFilter.values.map((value) => {
                      const used = features.some(
                        (item) =>
                          item.filterId === selectedFeatureFilter.id && item.valueId === value.id,
                      );
                      return {
                        id: value.id,
                        label: value.name,
                        disabled: used,
                        disabledLabel: "Eklendi",
                      };
                    })}
                    placeholder="Değer seçin"
                    emptyLabel="Değer seçin"
                    searchPlaceholder="Değer ara…"
                    noResultsLabel="Eşleşen değer yok"
                    className="min-w-0 flex-1"
                  />
                ) : null}
                {selectedFeatureFilter?.inputType === "BOOLEAN" ? (
                  <select
                    value={featureBoolean}
                    onChange={(event) => setFeatureBoolean(event.target.value as "true" | "false")}
                    className={`${inputClass} sm:w-40`}
                  >
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                ) : null}
                {selectedFeatureFilter?.inputType === "RANGE" ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={featureNumber}
                      onChange={(event) => setFeatureNumber(event.target.value)}
                      placeholder="Değer"
                      className={inputClass}
                    />
                    {selectedFeatureFilter.unit ? (
                      <span className="shrink-0 text-sm text-slate-500">{selectedFeatureFilter.unit}</span>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (!featureFilterId) return;
                    const filter = applicableFilters.find((item) => item.id === featureFilterId);
                    if (!filter) return;
                    if (
                      (filter.inputType === "MULTI_SELECT" || filter.inputType === "SWATCH") &&
                      !featureValueId
                    ) {
                      return;
                    }
                    if (filter.inputType === "RANGE") {
                      const parsed = Number(featureNumber.replace(",", "."));
                      if (!Number.isFinite(parsed)) return;
                      const alreadyRange = features.some((item) => item.filterId === featureFilterId);
                      if (alreadyRange) return;
                      setFeatures((prev) => [
                        ...prev,
                        {
                          filterId: featureFilterId,
                          numberValue: parsed,
                        },
                      ]);
                      setFeatureNumber("");
                      return;
                    }
                    if (filter.inputType === "BOOLEAN") {
                      const booleanValue = featureBoolean === "true";
                      const alreadyBool = features.some((item) => item.filterId === featureFilterId);
                      if (alreadyBool) return;
                      setFeatures((prev) => [
                        ...prev,
                        {
                          filterId: featureFilterId,
                          booleanValue,
                        },
                      ]);
                      return;
                    }
                    const alreadyAdded = features.some(
                      (item) =>
                        item.filterId === featureFilterId &&
                        item.valueId === (featureValueId || null),
                    );
                    if (alreadyAdded) return;
                    setFeatures((prev) => [
                      ...prev,
                      {
                        filterId: featureFilterId,
                        valueId: featureValueId || null,
                      },
                    ]);
                    setFeatureValueId("");
                  }}
                  className="shrink-0 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white"
                >
                  Ekle
                </button>
              </div>
              {features.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz özellik yok.</p>
              ) : (
                <ul className="divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
                  {features.map((feature, index) => {
                    const filter = customFilters.find((item) => item.id === feature.filterId);
                    const value = filter?.values.find((item) => item.id === feature.valueId);
                    let display = "—";
                    if (value?.name) display = value.name;
                    else if (filter?.inputType === "BOOLEAN") display = feature.booleanValue ? "Evet" : "Hayır";
                    else if (feature.numberValue != null) {
                      display = `${feature.numberValue}${filter?.unit ? ` ${filter.unit}` : ""}`;
                    }
                    return (
                      <li key={`${feature.filterId}-${feature.valueId ?? index}`} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          <strong className="font-medium text-slate-800">{filter?.name ?? "Özellik"}</strong>
                          <span className="text-slate-500"> · {display}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFeatures((prev) => prev.filter((_, i) => i !== index))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

      <div className={tab === "variants" ? "space-y-6" : "hidden"}>
        {tab === "variants" ? (
        <VariantCombinationsPanel
          hidden={false}
          variants={variants}
          attributes={attributes}
          productImages={gallery.map((item) => ({
            preview: item.preview,
            url: item.url,
            file: item.file,
          }))}
          taxRatePercent={taxPercent}
          defaultStock={defaultVariant?.stockQuantity ?? 0}
          lockStock={advancedInventory}
          basePriceMinor={basePriceMinor}
          sku={sku}
          inputClass={inputClass}
          onVariantsChange={setVariants}
          onOpenGenerator={() => setGeneratorOpen(true)}
        />
        ) : null}
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="px-5 py-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Stokta kalmadığında</p>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              {PRODUCT_OUT_OF_STOCK_BEHAVIORS.map((behavior) => {
                let label = "Varsayılan davranış";
                switch (behavior) {
                  case "DENY":
                    label = "Siparişe izin verme";
                    break;
                  case "ALLOW":
                    label = "Siparişe izin ver (ön sipariş)";
                    break;
                  case "DEFAULT":
                    label = "Varsayılan davranış";
                    break;
                  default: {
                    const _exhaustive: never = behavior;
                    label = _exhaustive;
                  }
                }
                return (
                  <label key={behavior} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="outOfStockBehavior"
                      value={behavior}
                      defaultChecked={(initial?.outOfStockBehavior ?? "DEFAULT") === behavior}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Stokta etiketi
                </label>
                <input name="inStockLabel" defaultValue={initial?.inStockLabel ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Stok yok etiketi
                </label>
                <input
                  name="outOfStockLabel"
                  defaultValue={initial?.outOfStockLabel ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className={`rounded-lg border border-[#e9ebec] bg-white shadow-sm ${tab === "shipping" ? "" : "hidden"}`}>
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Paket boyutları</h2>
            <p className="mt-1 text-sm text-slate-500">
              Desi ve kargo kuralı için ambalaj dahil ölçüleri girin.
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Genişlik (cm)</label>
              <input name="widthCm" defaultValue={initial?.widthCm ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Yükseklik (cm)</label>
              <input name="heightCm" defaultValue={initial?.heightCm ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Derinlik (cm)</label>
              <input name="depthCm" defaultValue={initial?.depthCm ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Ağırlık (kg)</label>
              <input name="weightKg" defaultValue={initial?.weightKg ?? ""} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Tahmini teslimat süresi
              </label>
              <select
                name="estimatedDelivery"
                defaultValue={initial?.estimatedDelivery ?? ""}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                {PRODUCT_ESTIMATED_DELIVERIES.map((value) => (
                  <option key={value} value={value}>
                    {productEstimatedDeliveryLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Ek kargo ücreti (₺)
              </label>
              <input
                name="extraShippingMajor"
                defaultValue={
                  initial?.extraShippingMinor
                    ? formatMinorToMajorInput(initial.extraShippingMinor)
                    : "0"
                }
                className={inputClass}
              />
            </div>
          </div>
        </section>

      <section className={`rounded-lg border border-[#e9ebec] bg-white shadow-sm ${tab === "pricing" ? "" : "hidden"}`}>
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Alış, satış ve indirimli fiyat</h2>
            <p className="mt-1 text-sm text-slate-500">
              İndirimli satış doluysa vitrinde satış fiyatı üstü çizili, müşteri indirimli tutarı öder.
            </p>
          </div>
          <div className="space-y-5 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {priceIncludesTax ? "Satış fiyatı (KDV dahil)" : "Satış fiyatı (KDV hariç)"}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                    ₺
                  </span>
                  <input
                    value={salePriceMajor}
                    onChange={(e) => {
                      setSalePriceMajor(e.target.value);
                      applyTypedPrices(
                        parseMajorToMinor(e.target.value) ?? 0,
                        parseMajorToMinor(discountPriceMajor),
                        priceIncludesTax,
                        taxPercent,
                      );
                    }}
                    className={`${inputClass} pl-8`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {priceIncludesTax
                    ? `${formatMinorToMajorInput(saleExclMinor)} ₺ KDV hariç`
                    : `${formatMinorToMajorInput(saleIncl)} ₺ KDV dahil`}
                </p>
              </div>

              <div className="w-full xl:w-56">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">KDV</label>
                <select
                  name="taxRatePercent"
                  value={taxRatePercent}
                  onChange={(e) => {
                    const next = e.target.value;
                    const tax = Number.parseInt(next, 10) || 0;
                    const saleExcl = saleTypedToExcl(
                      parseMajorToMinor(salePriceMajor) ?? 0,
                      priceIncludesTax,
                      taxPercent,
                    );
                    const discountTyped = parseMajorToMinor(discountPriceMajor);
                    const discountExcl =
                      discountTyped == null
                        ? null
                        : saleTypedToExcl(discountTyped, priceIncludesTax, taxPercent);
                    setTaxRatePercent(next);
                    if (priceIncludesTax) {
                      setSalePriceMajor(formatMinorToMajorInput(taxIncludedMinor(saleExcl, tax)));
                      if (discountExcl != null) {
                        setDiscountPriceMajor(
                          formatMinorToMajorInput(taxIncludedMinor(discountExcl, tax)),
                        );
                      }
                    }
                    syncSimpleVariantPrice(saleExcl, discountExcl);
                  }}
                  className={inputClass}
                >
                  {taxRateOptions.length === 0 ? (
                    <option value="">KDV oranı ekleyin</option>
                  ) : null}
                  {taxRateOptions.map((rate) => {
                    const label = rate.name.includes(String(rate.percent))
                      ? rate.name
                      : `${rate.name} (%${rate.percent})`;
                    return (
                      <option key={rate.id} value={String(rate.percent)}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-xs text-slate-400">
                  {taxPercent ? `KDV: %${taxPercent}` : "Oran seçin"} ·{" "}
                  <Link href="/admin/products/tax-rates" className="font-medium text-[#405189] hover:underline">
                    KDV Oranları
                  </Link>
                </p>
              </div>

              <div className="w-full xl:w-auto">
                <p className="mb-1.5 text-sm font-medium text-slate-700">&nbsp;</p>
                <label className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-md border border-[#e9ebec] px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-[#0ab39c]"
                    checked={priceIncludesTax}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const saleExcl = saleExclMinor;
                      const discountExcl = discountExclMinor;
                      setPriceIncludesTax(checked);
                      setSalePriceMajor(
                        formatMinorToMajorInput(
                          checked ? taxIncludedMinor(saleExcl, taxPercent) : saleExcl,
                        ),
                      );
                      if (discountExcl != null) {
                        setDiscountPriceMajor(
                          formatMinorToMajorInput(
                            checked ? taxIncludedMinor(discountExcl, taxPercent) : discountExcl,
                          ),
                        );
                      }
                      syncSimpleVariantPrice(saleExcl, discountExcl);
                    }}
                  />
                  KDV dahil
                </label>
              </div>
            </div>

            {!hasCombinations ? (
              <div className="max-w-xs">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Stok adedi</label>
                <input
                  type="number"
                  min={0}
                  readOnly={advancedInventory}
                  value={defaultVariant?.stockQuantity ?? 0}
                  onChange={(event) => setSimpleStock(event.target.value)}
                  className={catalogStockInputClass(inputClass, advancedInventory)}
                />
                <CatalogStockHint locked={advancedInventory} />
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Alış fiyatı (KDV hariç)
                </label>
                <input
                  name="costMajor"
                  value={costMajor}
                  onChange={(e) => setCostMajor(e.target.value)}
                  placeholder="Maliyet"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {priceIncludesTax
                    ? "İndirimli satış fiyatı (KDV dahil)"
                    : "İndirimli satış fiyatı (KDV hariç)"}
                </label>
                <input
                  value={discountPriceMajor}
                  onChange={(e) => {
                    setDiscountPriceMajor(e.target.value);
                    applyTypedPrices(
                      parseMajorToMinor(salePriceMajor) ?? 0,
                      parseMajorToMinor(e.target.value),
                      priceIncludesTax,
                      taxPercent,
                    );
                  }}
                  placeholder="Boş = indirim yok"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
            <div className="rounded-md bg-[#f3f6f9] px-4 py-3 text-sm text-slate-700">
              {compareAtMinor != null ? (
                <>
                  Vitrin: {formatMinorToMajorInput(taxIncludedMinor(compareAtMinor, taxPercent))} ₺
                  üstü çizili · {formatMinorToMajorInput(priceIncl)} ₺ indirimli (KDV dahil)
                </>
              ) : (
                <>
                  {formatMinorToMajorInput(saleExclMinor)} ₺ KDV hariç · {formatMinorToMajorInput(saleIncl)}{" "}
                  ₺ KDV dahil
                </>
              )}
            </div>
            <div className="rounded-md bg-[#f3f6f9] px-4 py-3 text-sm text-slate-700">
              {formatMinorToMajorInput(marginMinor(basePriceMinor, costMinor))} ₺ marj
              {marginRatePercent(basePriceMinor, costMinor) != null
                ? ` · %${marginRatePercent(basePriceMinor, costMinor)?.toFixed(1)}`
                : ""}
              {costMinor ? ` · alış ${formatMinorToMajorInput(costMinor)} ₺` : ""}
            </div>
          </div>
          <div className="border-t border-[#e9ebec] px-5 py-4">
            <AdminSwitch name="onSale" label="Listede “Satışta” etiketini göster" defaultChecked={initial?.onSale ?? false} />
            {hasCombinations ? (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-[#405189] hover:underline"
                onClick={() =>
                  setVariants((prev) =>
                    prev.map((item) => ({
                      ...item,
                      priceMinor: basePriceMinor,
                      compareAtMinor,
                    })),
                  )
                }
              >
                Satış ve indirimli fiyatı tüm kombinasyonlara uygula
              </button>
            ) : null}
          </div>
        </section>

      <section className={`rounded-lg border border-[#e9ebec] bg-white shadow-sm ${tab === "seo" ? "" : "hidden"}`}>
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Arama motoru</h2>
          </div>
          <div className="grid gap-5 p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug (URL)</label>
              <input
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Ön yüz:{" "}
                <a
                  href={publicProductHref(slug || "ornek-urun", urlStructure, initial?.urlId ?? 1)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#405189] hover:underline"
                >
                  {publicProductHref(slug || "ornek-urun", urlStructure, initial?.urlId ?? 1)}
                </a>
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">SEO başlığı</label>
              <input name="seoTitle" defaultValue={initial?.seoTitle ?? ""} maxLength={191} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">SEO açıklaması</label>
              <textarea
                name="seoDescription"
                rows={3}
                maxLength={500}
                defaultValue={initial?.seoDescription ?? ""}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </section>

      <div className={tab === "options" ? "space-y-6" : "hidden"}>
          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Görünürlük</h2>
              <p className="mt-1 text-sm text-slate-500">Ürününüzün nerede görünmesini istersiniz?</p>
            </div>
            <div className="space-y-2 p-5 text-sm text-slate-700">
              {PRODUCT_VISIBILITIES.map((value) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    defaultChecked={(initial?.visibility ?? "EVERYWHERE") === value}
                  />
                  {productVisibilityLabel(value)}
                </label>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminSwitch
                name="availableForOrder"
                label="Siparişe müsait"
                defaultChecked={initial?.availableForOrder ?? true}
              />
              <AdminSwitch name="showPrice" label="Fiyatı göster" defaultChecked={initial?.showPrice ?? true} />
              <AdminSwitch name="onlineOnly" label="Sadece çevrimiçi" defaultChecked={initial?.onlineOnly ?? false} />
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Sipariş kuralları</h2>
              <p className="mt-1 text-sm text-slate-500">Satış birimi, minimum adet ve miktar katı.</p>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Birim</label>
                <select
                  name="saleUnit"
                  value={saleUnit}
                  onChange={(event) => setSaleUnit(event.target.value as typeof saleUnit)}
                  className={inputClass}
                >
                  {PRODUCT_SALE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {productSaleUnitLabel(unit)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Minimum sipariş</label>
                <input
                  name="minOrderQty"
                  type="number"
                  min={1}
                  value={minOrderQty}
                  onChange={(event) => setMinOrderQty(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Miktar katı</label>
                <input
                  name="quantityStep"
                  type="number"
                  min={1}
                  value={quantityStep}
                  onChange={(event) => setQuantityStep(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">İlgili ürünler</h2>
              <p className="mt-1 text-sm text-slate-500">Detay sayfasında önerilecek ürünler.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchableSelect
                  value={relatedPickId}
                  onChange={setRelatedPickId}
                  options={relatedCandidates
                    .filter((item) => !relatedIds.includes(item.id))
                    .map((item) => ({
                      id: item.id,
                      label: item.sku ? `${item.title} (${item.sku})` : item.title,
                    }))}
                  placeholder="Ürün seçin"
                  emptyLabel="Ürün seçin"
                  searchPlaceholder="Ürün ara…"
                  noResultsLabel="Eşleşen ürün yok"
                  className="min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!relatedPickId || relatedIds.includes(relatedPickId)) return;
                    setRelatedIds((prev) => [...prev, relatedPickId]);
                    setRelatedPickId("");
                  }}
                  className="shrink-0 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white"
                >
                  Ekle
                </button>
              </div>
              {relatedIds.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz ilgili ürün yok.</p>
              ) : (
                <ul className="divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
                  {relatedIds.map((id) => {
                    const item = relatedCandidates.find((row) => row.id === id);
                    return (
                      <li key={id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-slate-800">{item?.title ?? id}</span>
                        <button
                          type="button"
                          onClick={() => setRelatedIds((prev) => prev.filter((row) => row !== id))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Ek dosyalar</h2>
              <p className="mt-1 text-sm text-slate-500">PDF kılavuz, teknik şartname (en fazla 8 MB).</p>
            </div>
            <div className="space-y-3 p-5">
              <button
                type="button"
                onClick={() => attachmentFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Dosya ekle
              </button>
              <input
                ref={attachmentFileRef}
                type="file"
                multiple
                accept=".pdf,.zip,.doc,.docx,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  if (!files.length) return;
                  setAttachments((prev) => [
                    ...prev,
                    ...files.map((file) => ({
                      key: `att-${Math.random().toString(36).slice(2, 10)}`,
                      name: file.name.replace(/\.[^.]+$/, "").slice(0, 191) || "Dosya",
                      file,
                    })),
                  ]);
                  event.target.value = "";
                }}
              />
              {attachments.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz ek dosya yok.</p>
              ) : (
                <ul className="divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
                  {attachments.map((item) => (
                    <li key={item.key} className="flex items-center gap-3 px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        value={item.name}
                        onChange={(event) =>
                          setAttachments((prev) =>
                            prev.map((row) =>
                              row.key === item.key ? { ...row, name: event.target.value } : row,
                            ),
                          )
                        }
                        className={`${inputClass} py-1.5`}
                      />
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs font-medium text-[#405189] hover:underline"
                        >
                          Aç
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((row) => row.key !== item.key))}
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

      <input type="hidden" name="sortOrder" defaultValue={initial?.sortOrder ?? ""} />

      <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebec] bg-white py-4">
        <Link href="/admin/products" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Kataloğa git
        </Link>
        <div className="flex flex-wrap gap-2">
          {mode === "edit" && initial?.id ? (
            <Can resource="products" action="create">
            <button
              type="button"
              disabled={isPending || duplicating}
              onClick={async () => {
                setDuplicating(true);
                const result = await duplicateProductAction({ id: initial.id! });
                setDuplicating(false);
                if (result.redirectId) {
                  router.push(`/admin/products/${result.redirectId}/edit`);
                  return;
                }
                if (result.error) window.alert(result.error);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-70"
            >
              {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Kopyala
            </button>
            </Can>
          ) : null}
          <Link
            href="/admin/products"
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            İptal
          </Link>
          <Can resource="products" action={mode === "create" ? "create" : "update"}>
          <button
            type="submit"
            name="saveIntent"
            value="draft"
            disabled={isPending}
            onClick={() => {
              saveIntentRef.current = "draft";
            }}
            className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Taslak kaydet
          </button>
          <button
            type="submit"
            name="saveIntent"
            value="publish"
            disabled={isPending}
            onClick={() => {
              saveIntentRef.current = "publish";
            }}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet ve yayınla
          </button>
          </Can>
        </div>
      </div>

      {generatorOpen ? (
        <GenerateCombinationsModal
          attributes={attributes}
          existingCombinationKeys={variants.filter(isRealCombination).map((item) => item.combinationKey)}
          existingSelections={variants.filter(isRealCombination).flatMap((item) => item.selections)}
          onClose={() => setGeneratorOpen(false)}
          onGenerate={applyGenerated}
        />
      ) : null}
    </form>
  );
}
