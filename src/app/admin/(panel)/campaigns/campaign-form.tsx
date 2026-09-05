"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  CAMPAIGN_KINDS,
  campaignKindLabel,
  type CampaignKindCode,
  type CampaignSearchProduct,
} from "@/lib/campaign-kinds";
import {
  createCampaignAction,
  previewCampaignTargetsAction,
  searchCampaignProductsAction,
  updateCampaignAction,
} from "./actions";

type LookupOption = { id: string; label: string; depth?: number };

export type CampaignFormInitial = {
  id: string;
  name: string;
  kind: CampaignKindCode;
  value: string;
  countdown: boolean;
  startsAt: string;
  endsAt: string;
  inStockOnly: boolean;
  categoryIds: string[];
  brandIds: string[];
  products: CampaignSearchProduct[];
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

function appendIds(form: FormData, name: string, ids: string[]) {
  for (const id of ids) form.append(name, id);
}

export function CampaignForm({
  categories,
  brands,
  initial,
}: {
  categories: LookupOption[];
  brands: LookupOption[];
  initial?: CampaignFormInitial;
}) {
  const router = useRouter();
  const campaignId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<CampaignKindCode>(initial?.kind ?? "PERCENT_OFF");
  const [value, setValue] = useState(initial?.value ?? "15");
  const [countdown, setCountdown] = useState(initial?.countdown ?? false);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [inStockOnly, setInStockOnly] = useState(initial?.inStockOnly ?? true);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [brandIds, setBrandIds] = useState<string[]>(initial?.brandIds ?? []);
  const [products, setProducts] = useState<CampaignSearchProduct[]>(initial?.products ?? []);
  const [categoryPick, setCategoryPick] = useState("");
  const [brandPick, setBrandPick] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<CampaignSearchProduct[]>([]);
  const [preview, setPreview] = useState<{ eligible: number; matched: number; busy: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searching, startSearch] = useTransition();

  const needsValue = kind !== "FREE_SHIPPING";
  const categoryOptions = useMemo(
    () => categories.filter((option) => !categoryIds.includes(option.id)),
    [categories, categoryIds],
  );
  const brandOptions = useMemo(
    () => brands.filter((option) => !brandIds.includes(option.id)),
    [brands, brandIds],
  );

  function buildForm() {
    const form = new FormData();
    if (campaignId) form.set("campaignId", campaignId);
    form.set("name", name);
    form.set("kind", kind);
    form.set("value", value);
    form.set("countdown", countdown ? "true" : "false");
    form.set("startsAt", startsAt);
    form.set("endsAt", endsAt);
    form.set("inStockOnly", inStockOnly ? "true" : "false");
    appendIds(form, "categoryIds", categoryIds);
    appendIds(form, "brandIds", brandIds);
    appendIds(
      form,
      "productIds",
      products.map((product) => product.id),
    );
    return form;
  }

  function addCategory(id: string) {
    if (!id || categoryIds.includes(id)) return;
    setCategoryIds((current) => [...current, id]);
    setCategoryPick("");
    setPreview(null);
  }

  function addBrand(id: string) {
    if (!id || brandIds.includes(id)) return;
    setBrandIds((current) => [...current, id]);
    setBrandPick("");
    setPreview(null);
  }

  function addProduct(product: CampaignSearchProduct) {
    if (product.busy || products.some((row) => row.id === product.id)) return;
    setProducts((current) => [...current, product]);
    setPreview(null);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = campaignId
            ? await updateCampaignAction(buildForm())
            : await createCampaignAction(buildForm());
          if (result.error) {
            setError(result.error);
            return;
          }
          if (result.id) router.push(`/admin/campaigns/${result.id}`);
        });
      }}
    >
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Kampanya bilgisi</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Kampanya adı</span>
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn. Bahar fırsatları"
              required
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-xs font-medium text-slate-500">Kampanya modeli</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAMPAIGN_KINDS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    kind === option ? "border-[#0ab39c] bg-[#0ab39c]/5" : "border-[#e9ebec]"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    className="mt-0.5"
                    checked={kind === option}
                    onChange={() => {
                      setKind(option);
                      if (option === "FREE_SHIPPING") setValue("");
                      else if (!value) setValue(option === "FIXED_OFF" ? "50" : "15");
                    }}
                  />
                  <span>
                    <span className="font-medium text-slate-800">{campaignKindLabel(option)}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {option === "PERCENT_OFF"
                        ? "Ürün fiyatına yüzde indirim"
                        : option === "FIXED_OFF"
                          ? "Ürün fiyatından sabit TL düş"
                          : option === "FREE_SHIPPING"
                            ? "Seçilen ürünlerde ek kargo bedeli alınmaz"
                            : "Vitrinde etiket, sepette yüzde indirim"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {needsValue ? (
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {kind === "FIXED_OFF" ? "İndirim tutarı (TL)" : "İndirim oranı (%)"}
              </span>
              <input
                className={inputClass}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                inputMode="decimal"
                placeholder={kind === "FIXED_OFF" ? "50" : "15"}
                required
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={countdown}
              onChange={(event) => setCountdown(event.target.checked)}
            />
            Geri sayım kullan
          </label>
          {countdown ? (
            <>
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Başlangıç</span>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Bitiş</span>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  required
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Hedef ürünler</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategori, marka ve seçilen ürünler birlikte kesişir. En az birini seçin.
          {campaignId
            ? " Kayıt, ürün listesini yeni şartlara göre günceller; çıkan ürünlerin fiyatı geri alınır."
            : ""}
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => {
              setInStockOnly(event.target.checked);
              setPreview(null);
            }}
          />
          Yalnızca depo stoğu olan ürünler
        </label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Kategoriler</p>
            <SearchableSelect
              value={categoryPick}
              onChange={addCategory}
              options={categoryOptions}
              placeholder="Kategori ekle…"
              emptyLabel="Kategori seçin"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryIds.map((id) => {
                const option = categories.find((row) => row.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {option?.label ?? id}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryIds((current) => current.filter((row) => row !== id));
                        setPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Markalar</p>
            <SearchableSelect
              value={brandPick}
              onChange={addBrand}
              options={brandOptions}
              placeholder="Marka ekle…"
              emptyLabel="Marka seçin"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {brandIds.map((id) => {
                const option = brands.find((row) => row.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {option?.label ?? id}
                    <button
                      type="button"
                      onClick={() => {
                        setBrandIds((current) => current.filter((row) => row !== id));
                        setPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1 text-xs font-medium text-slate-500">Seçilen ürünler</p>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Ürün adı veya SKU ara…"
              />
            </label>
            <button
              type="button"
              disabled={searching || productQuery.trim().length < 2}
              onClick={() => {
                startSearch(async () => {
                  const result = await searchCampaignProductsAction(
                    productQuery,
                    campaignId ?? undefined,
                  );
                  setProductHits(result.products ?? []);
                });
              }}
              className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-50"
            >
              Ara
            </button>
          </div>
          {productHits.length > 0 ? (
            <ul className="mt-2 divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
              {productHits.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{product.title}</span>
                    <span className="text-xs text-slate-500">
                      {product.sku || "SKU yok"}
                      {product.brandName ? ` · ${product.brandName}` : ""}
                      {product.busy ? " · aktif kampanya" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={product.busy || products.some((row) => row.id === product.id)}
                    onClick={() => addProduct(product)}
                    className="shrink-0 text-xs font-semibold text-[#0ab39c] disabled:text-slate-400"
                  >
                    {product.busy ? "Dolu" : "Ekle"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {products.map((product) => (
              <span
                key={product.id}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800"
              >
                {product.title}
                <button
                  type="button"
                  onClick={() => {
                    setProducts((current) => current.filter((row) => row.id !== product.id));
                    setPreview(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {preview ? (
        <p className="rounded-md border border-[#e9ebec] bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {preview.matched.toLocaleString("tr-TR")} ürün eşleşti,{" "}
          {preview.eligible.toLocaleString("tr-TR")} ürüne uygulanacak
          {preview.busy > 0
            ? `, ${preview.busy.toLocaleString("tr-TR")} ürün zaten başka bir kampanyada`
            : ""}
          .
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await previewCampaignTargetsAction(buildForm());
              if ("error" in result && result.error) {
                setError(result.error);
                setPreview(null);
                return;
              }
              if ("eligible" in result) setPreview(result);
            });
          }}
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Ürünleri önizle
        </button>
        {campaignId ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => router.push(`/admin/campaigns/${campaignId}`)}
            className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            İptal
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {campaignId ? "Değişiklikleri kaydet" : "Kampanyayı oluştur"}
        </button>
      </div>
    </form>
  );
}
