"use client";

import { useMemo, useState } from "react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  parseUrlStructure,
  sanitizeUrlPrefix,
  URL_PREFIX_SUGGESTIONS,
  urlPrefixCollisions,
  urlStructureExamples,
} from "@/lib/url-structure";

type UrlStructurePanelProps = {
  values: Record<string, string>;
};

function PrefixField({
  id,
  name,
  label,
  hint,
  value,
  onChange,
  fallback,
  allowEmpty = false,
  suggestions,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  fallback: string;
  allowEmpty?: boolean;
  suggestions: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-md border border-[#e9ebec] bg-white focus-within:border-[#0ab39c] focus-within:ring-2 focus-within:ring-[#0ab39c]/20">
        <span className="flex items-center bg-[#f3f6f9] px-3 font-mono text-sm text-slate-500">/</span>
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onChange(sanitizeUrlPrefix(value, fallback, allowEmpty))}
          placeholder={allowEmpty ? "boş = kök dizin" : ""}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-sm text-slate-800 outline-none"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((item) => {
          const active = value === item.value;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onChange(item.value)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-[#0ab39c] bg-[#0ab39c]/10 font-medium text-[#0ab39c]"
                  : "border-[#e9ebec] text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function UrlStructurePanel({ values }: UrlStructurePanelProps) {
  const initial = parseUrlStructure(values);
  const [catalog, setCatalog] = useState(initial.catalog);
  const [product, setProduct] = useState(initial.product);
  const [category, setCategory] = useState(initial.category);
  const [brand, setBrand] = useState(initial.brand);
  const [productIncludeId, setProductIncludeId] = useState(initial.productIncludeId);
  const [categoryIncludeId, setCategoryIncludeId] = useState(initial.categoryIncludeId);
  const [brandIncludeId, setBrandIncludeId] = useState(initial.brandIncludeId);

  const structure = useMemo(
    () => ({
      catalog: sanitizeUrlPrefix(catalog, "katalog"),
      product: sanitizeUrlPrefix(product, "", true),
      category: sanitizeUrlPrefix(category, "kategori"),
      brand: sanitizeUrlPrefix(brand, "marka"),
      productIncludeId,
      categoryIncludeId,
      brandIncludeId,
    }),
    [brand, brandIncludeId, catalog, category, categoryIncludeId, product, productIncludeId],
  );

  const examples = useMemo(() => urlStructureExamples(structure), [structure]);
  const collisions = useMemo(() => urlPrefixCollisions(structure), [structure]);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <PrefixField
        id="url_catalog_path"
        name="url_catalog_path"
        label="Katalog / arama öneki"
        hint="Tüm ürün listesi ve arama kutusu bu adrese gider."
        value={catalog}
        onChange={setCatalog}
        fallback="katalog"
        suggestions={URL_PREFIX_SUGGESTIONS.catalog}
      />

      <div className="space-y-3">
        <PrefixField
          id="url_product_path"
          name="url_product_path"
          label="Ürün detay öneki"
          hint="Boş bırakılırsa ürün kök dizinde açılır. CMS sayfasıyla aynı slug paylaşılmaz."
          value={product}
          onChange={setProduct}
          fallback=""
          allowEmpty
          suggestions={URL_PREFIX_SUGGESTIONS.product}
        />
        <AdminSwitch
          name="url_product_include_id"
          label="Ürün URL’sine kalıcı ID ekle"
          description="/ürün-adı/1 — ad değişse bile ID aynı kaydı bulur"
          checked={productIncludeId}
          onChange={setProductIncludeId}
        />
      </div>

      <div className="space-y-3">
        <PrefixField
          id="url_category_path"
          name="url_category_path"
          label="Kategori öneki"
          hint="İstediğiniz dizini yazın. Örn. kategori, dizin, koleksiyon"
          value={category}
          onChange={setCategory}
          fallback="kategori"
          suggestions={URL_PREFIX_SUGGESTIONS.category}
        />
        <AdminSwitch
          name="url_category_include_id"
          label="Kategori URL’sine kalıcı ID ekle"
          description="/kategori/giyim/1"
          checked={categoryIncludeId}
          onChange={setCategoryIncludeId}
        />
      </div>

      <div className="space-y-3">
        <PrefixField
          id="url_brand_path"
          name="url_brand_path"
          label="Marka öneki"
          value={brand}
          onChange={setBrand}
          fallback="marka"
          suggestions={URL_PREFIX_SUGGESTIONS.brand}
        />
        <AdminSwitch
          name="url_brand_include_id"
          label="Marka URL’sine kalıcı ID ekle"
          description="/marka/nike/1"
          checked={brandIncludeId}
          onChange={setBrandIncludeId}
        />
      </div>

      {collisions.length > 0 ? (
        <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {collisions.join(" ")}
        </div>
      ) : null}

      <div className="md:col-span-2 rounded-lg border border-[#e9ebec] bg-[#f3f6f9] px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Canlı önizleme
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Ürün</dt>
            <dd className="font-mono text-[13px] text-slate-800">{examples.product}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Kategori</dt>
            <dd className="font-mono text-[13px] text-slate-800">{examples.category}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Arama</dt>
            <dd className="font-mono text-[13px] text-slate-800">{examples.search}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Marka</dt>
            <dd className="font-mono text-[13px] text-slate-800">{examples.brand}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          ID açıkken eski slug’lı adresler yeni kalıcı adrese yönlendirilir. Eski /urunler…
          adresleri de yeni yapıya gider.
        </p>
      </div>
    </div>
  );
}
