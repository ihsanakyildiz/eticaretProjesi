"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  DISCOUNT_COUPON_KINDS,
  DISCOUNT_COUPON_USAGES,
  discountCouponKindLabel,
  discountCouponUsageLabel,
  type DiscountCouponCustomerOption,
  type DiscountCouponKindCode,
  type DiscountCouponSearchProduct,
  type DiscountCouponStatusCode,
  type DiscountCouponUsageCode,
} from "@/lib/discount-coupon-kinds";
import {
  createCouponAction,
  searchCouponCustomersAction,
  searchCouponProductsAction,
  updateCouponAction,
} from "./actions";

type LookupOption = { id: string; label: string; depth?: number };

export type CouponFormInitial = {
  id: string;
  code: string;
  name: string;
  kind: DiscountCouponKindCode;
  value: string;
  usageMode: DiscountCouponUsageCode;
  status: DiscountCouponStatusCode;
  startsAt: string;
  endsAt: string;
  minSubtotal: string;
  customerId: string | null;
  customer: DiscountCouponCustomerOption | null;
  categoryIds: string[];
  brandIds: string[];
  products: DiscountCouponSearchProduct[];
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

function appendIds(form: FormData, name: string, ids: string[]) {
  for (const id of ids) form.append(name, id);
}

export function CouponForm({
  categories,
  brands,
  initial,
}: {
  categories: LookupOption[];
  brands: LookupOption[];
  initial?: CouponFormInitial;
}) {
  const router = useRouter();
  const couponId = initial?.id ?? null;
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<DiscountCouponKindCode>(initial?.kind ?? "PERCENT");
  const [value, setValue] = useState(initial?.value ?? "10");
  const [usageMode, setUsageMode] = useState<DiscountCouponUsageCode>(
    initial?.usageMode ?? "UNLIMITED",
  );
  const [status, setStatus] = useState<DiscountCouponStatusCode>(initial?.status ?? "ACTIVE");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [minSubtotal, setMinSubtotal] = useState(initial?.minSubtotal ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [customer, setCustomer] = useState<DiscountCouponCustomerOption | null>(
    initial?.customer ?? null,
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [brandIds, setBrandIds] = useState<string[]>(initial?.brandIds ?? []);
  const [products, setProducts] = useState<DiscountCouponSearchProduct[]>(
    initial?.products ?? [],
  );
  const [categoryPick, setCategoryPick] = useState("");
  const [brandPick, setBrandPick] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<DiscountCouponSearchProduct[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<DiscountCouponCustomerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searching, startSearch] = useTransition();
  const [searchingCustomers, startCustomerSearch] = useTransition();

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
    if (couponId) form.set("couponId", couponId);
    form.set("code", code);
    form.set("name", name);
    form.set("kind", kind);
    form.set("value", value);
    form.set("usageMode", usageMode);
    form.set("status", status);
    form.set("startsAt", startsAt);
    form.set("endsAt", endsAt);
    form.set("minSubtotal", minSubtotal);
    if (customerId) form.set("customerId", customerId);
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
  }

  function addBrand(id: string) {
    if (!id || brandIds.includes(id)) return;
    setBrandIds((current) => [...current, id]);
    setBrandPick("");
  }

  function addProduct(product: DiscountCouponSearchProduct) {
    if (products.some((row) => row.id === product.id)) return;
    setProducts((current) => [...current, product]);
  }

  function selectCustomer(option: DiscountCouponCustomerOption) {
    setCustomerId(option.id);
    setCustomer(option);
    setCustomerHits([]);
    setCustomerQuery("");
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = couponId
            ? await updateCouponAction(buildForm())
            : await createCouponAction(buildForm());
          if (result.error) {
            setError(result.error);
            return;
          }
          router.push("/admin/campaigns/coupons");
          router.refresh();
        });
      }}
    >
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Kod bilgisi</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">İndirim kodu</span>
            <input
              className={`${inputClass} font-mono uppercase`}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Örn. BAHAR10"
              required
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Görünen ad (isteğe bağlı)
            </span>
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn. Bahar hediye çeki"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-xs font-medium text-slate-500">İndirim türü</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DISCOUNT_COUPON_KINDS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    kind === option
                      ? "border-[#0ab39c] bg-teal-50 text-teal-900"
                      : "border-[#e9ebec] text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === option}
                    onChange={() => {
                      setKind(option);
                      setValue(option === "PERCENT" ? "10" : "50");
                    }}
                  />
                  {discountCouponKindLabel(option)}
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {kind === "PERCENT" ? "İndirim oranı (%)" : "İndirim tutarı (TL)"}
            </span>
            <input
              className={inputClass}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="decimal"
              required
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Minimum sepet (TL, boş = yok)
            </span>
            <input
              className={inputClass}
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(event.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-xs font-medium text-slate-500">Kullanım modu</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {DISCOUNT_COUPON_USAGES.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    usageMode === option
                      ? "border-[#0ab39c] bg-teal-50 text-teal-900"
                      : "border-[#e9ebec] text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="usageMode"
                    checked={usageMode === option}
                    onChange={() => {
                      setUsageMode(option);
                      if (option !== "CUSTOMER") {
                        setCustomerId("");
                        setCustomer(null);
                      }
                    }}
                  />
                  {discountCouponUsageLabel(option)}
                </label>
              ))}
            </div>
          </fieldset>

          {usageMode === "CUSTOMER" ? (
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-slate-500">Müşteri</p>
              {customer ? (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800">
                  {customer.label}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setCustomerId("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputClass} pl-9`}
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="E-posta, ad veya müşteri no ara…"
                  />
                </label>
                <button
                  type="button"
                  disabled={searchingCustomers || customerQuery.trim().length < 2}
                  onClick={() => {
                    startCustomerSearch(async () => {
                      const result = await searchCouponCustomersAction(customerQuery);
                      setCustomerHits(result.customers ?? []);
                    });
                  }}
                  className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-50"
                >
                  Ara
                </button>
              </div>
              {customerHits.length > 0 ? (
                <ul className="mt-2 divide-y divide-[#e9ebec] rounded-md border border-[#e9ebec]">
                  {customerHits.map((option) => (
                    <li
                      key={option.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      <button
                        type="button"
                        onClick={() => selectCustomer(option)}
                        className="shrink-0 text-xs font-semibold text-[#0ab39c]"
                      >
                        Seç
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

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
            />
          </label>

          {couponId ? (
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-500">Durum</span>
              <select
                className={inputClass}
                value={status}
                onChange={(event) => setStatus(event.target.value as DiscountCouponStatusCode)}
              >
                <option value="ACTIVE">Aktif</option>
                <option value="DISABLED">Pasif</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Kapsam</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategori, marka veya ürün seçmezseniz kod tüm sepet kalemlerine uygulanır (sepet
          aşamasında).
        </p>

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
                      onClick={() =>
                        setCategoryIds((current) => current.filter((row) => row !== id))
                      }
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
                      onClick={() => setBrandIds((current) => current.filter((row) => row !== id))}
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
                  const result = await searchCouponProductsAction(productQuery);
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
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">
                      {product.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {product.sku || "SKU yok"}
                      {product.brandName ? ` · ${product.brandName}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={products.some((row) => row.id === product.id)}
                    onClick={() => addProduct(product)}
                    className="shrink-0 text-xs font-semibold text-[#0ab39c] disabled:text-slate-400"
                  >
                    Ekle
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
                  onClick={() =>
                    setProducts((current) => current.filter((row) => row.id !== product.id))
                  }
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/campaigns/coupons")}
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : couponId ? "Güncelle" : "Oluştur"}
        </button>
      </div>
    </form>
  );
}
