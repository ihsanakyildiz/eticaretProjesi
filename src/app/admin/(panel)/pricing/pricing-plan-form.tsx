"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { PricingFeatureItem, PricingPriceType } from "@/lib/pricing";
import { slugify } from "@/lib/slug";
import {
  createPricingPlanAction,
  updatePricingPlanAction,
  type PricingFormState,
} from "./actions";

type PricingPlanFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  blurb?: string | null;
  detailContent?: string | null;
  coverImage?: string | null;
  priceType?: PricingPriceType;
  priceRangeMin?: string | null;
  priceRangeMax?: string | null;
  priceMonthly?: string;
  priceYearly?: string;
  priceMonthlyDiscount?: string | null;
  priceYearlyDiscount?: string | null;
  showPeriod?: boolean;
  featured?: boolean;
  features?: PricingFeatureItem[];
  ctaLabel?: string;
  ctaHref?: string;
  purchasable?: boolean;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

const emptyFeature = (): PricingFeatureItem => ({
  label: "",
  included: true,
});

export function PricingPlanForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: PricingPlanFormInitial;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const boundUpdate = updatePricingPlanAction.bind(null, initial?.id ?? "");
  const action = mode === "create" ? createPricingPlanAction : boundUpdate;
  const [state, formAction, pending] = useActionState<
    PricingFormState,
    FormData
  >(action, {});

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [detailContent, setDetailContent] = useState(
    initial?.detailContent ?? "",
  );
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(initial?.coverImage ?? "");
  const [features, setFeatures] = useState<PricingFeatureItem[]>(
    initial?.features && initial.features.length > 0
      ? initial.features
      : [emptyFeature()],
  );
  const [priceType, setPriceType] = useState<PricingPriceType>(
    initial?.priceType ?? "FIXED",
  );

  const stripeAllowed = priceType === "FIXED";

  useEffect(() => {
    if (state.success) {
      router.push("/admin/pricing");
      router.refresh();
    }
  }, [state.success, router]);

  const updateFeature = (
    index: number,
    patch: Partial<PricingFeatureItem>,
  ) => {
    setFeatures((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.message && state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <input type="hidden" name="coverImage" value={coverImage} />

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Paket adı
            </label>
            <input
              name="name"
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugify(next));
              }}
              required
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1 text-xs text-rose-600">
                {state.fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug (detay URL)
            </label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-400">/paket/</span>
              <input
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="standart"
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Detay sayfası adresi. Boş bırakılırsa paket adından üretilir.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa açıklama
            </label>
            <input
              name="blurb"
              defaultValue={initial?.blurb ?? ""}
              placeholder="Büyüyen ekipler için"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Fiyat gösterimi
            </label>
            <select
              name="priceType"
              value={priceType}
              onChange={(event) =>
                setPriceType(event.target.value as PricingPriceType)
              }
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            >
              <option value="FIXED">Sabit fiyat (tek seferlik)</option>
              <option value="RANGE">Fiyat aralığı</option>
              <option value="QUOTE">Teklif alın (fiyat gösterme)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Aralık ve teklif modunda Stripe ile doğrudan ödeme kapalıdır.
            </p>
          </div>

          {priceType === "FIXED" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Proje fiyatı (tek seferlik)
                </label>
                <input
                  name="priceMonthly"
                  defaultValue={initial?.priceMonthly ?? ""}
                  placeholder="₺19.900"
                  required
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
                {state.fieldErrors?.priceMonthly ? (
                  <p className="mt-1 text-xs text-rose-600">
                    {state.fieldErrors.priceMonthly}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  İndirimli proje fiyatı
                </label>
                <input
                  name="priceMonthlyDiscount"
                  defaultValue={initial?.priceMonthlyDiscount ?? ""}
                  placeholder="Boş bırakılırsa indirim yok"
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
              </div>
            </>
          ) : null}

          {priceType === "RANGE" ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Aralık — alt sınır
                </label>
                <input
                  name="priceRangeMin"
                  defaultValue={initial?.priceRangeMin ?? ""}
                  placeholder="₺15.000"
                  required
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
                {state.fieldErrors?.priceRangeMin ? (
                  <p className="mt-1 text-xs text-rose-600">
                    {state.fieldErrors.priceRangeMin}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Aralık — üst sınır
                </label>
                <input
                  name="priceRangeMax"
                  defaultValue={initial?.priceRangeMax ?? ""}
                  placeholder="₺25.000"
                  required
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
                />
                {state.fieldErrors?.priceRangeMax ? (
                  <p className="mt-1 text-xs text-rose-600">
                    {state.fieldErrors.priceRangeMax}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {priceType === "QUOTE" ? (
            <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Sitede fiyat yerine &quot;Teklif alın&quot; gösterilir. CTA metni
              ve linki ile iletişime yönlendirin.
            </div>
          ) : null}

          {priceType !== "FIXED" ? (
            <input type="hidden" name="priceMonthly" value="" />
          ) : null}
          <input type="hidden" name="priceYearlyDiscount" value="" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              CTA metni
            </label>
            <input
              name="ctaLabel"
              defaultValue={initial?.ctaLabel ?? "Başlayın"}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              CTA linki
            </label>
            <input
              name="ctaHref"
              defaultValue={initial?.ctaHref ?? "/iletisim"}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
          {stripeAllowed ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Stripe Price ID (tek seferlik / aylık)
                </label>
                <input
                  name="stripePriceIdMonthly"
                  defaultValue={initial?.stripePriceIdMonthly ?? ""}
                  placeholder="price_..."
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 font-mono text-sm outline-none focus:border-[#405189]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Stripe Price ID (yıllık — abonelik modunda)
                </label>
                <input
                  name="stripePriceIdYearly"
                  defaultValue={initial?.stripePriceIdYearly ?? ""}
                  placeholder="price_..."
                  className="w-full rounded-md border border-[#e9ebec] px-3 py-2 font-mono text-sm outline-none focus:border-[#405189]"
                />
              </div>
            </>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              type="number"
              name="sortOrder"
              defaultValue={initial?.sortOrder ?? ""}
              placeholder="Otomatik"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <AdminSwitch
            name="showPeriod"
            label="Tek seferlik etiketi göster"
            description="Sabit ve aralık fiyatında “tek seferlik” yazar."
            defaultChecked={initial?.showPeriod !== false}
          />
          {stripeAllowed ? (
            <AdminSwitch
              name="purchasable"
              label="Stripe ile satın alınabilir"
              description="Yalnızca sabit fiyatlı paketlerde geçerlidir."
              defaultChecked={initial?.purchasable === true}
            />
          ) : (
            <input type="hidden" name="purchasable" value="off" />
          )}
          <AdminSwitch
            name="featured"
            label="Öne çıkan paket"
            defaultChecked={initial?.featured === true}
          />
          <AdminSwitch
            name="isActive"
            label="Aktif"
            defaultChecked={initial?.isActive !== false}
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Kapak görseli</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Detay sayfasının üstünde tam genişlikte gösterilir. PNG, JPG veya
            WEBP — kayıtta WebP’ye çevrilir.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-36 w-full max-w-sm shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-slate-300" />
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
              {coverPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage("");
                    setCoverPreview("");
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
              name="coverImage_file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setCoverPreview(URL.createObjectURL(file));
              }}
            />
            <p className="text-xs text-slate-400">
              Önerilen oran 16:9, en az 1600×900 px.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Detay sayfası içeriği
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Paket kartındaki “Detay” butonu bu içeriğin olduğu sayfayı açar.
          </p>
        </div>
        <RichTextEditor
          id="detailContent"
          name="detailContent"
          variant="full"
          value={detailContent}
          placeholder="Paket hakkında ayrıntılı açıklama…"
          onChange={setDetailContent}
        />
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Özellikler</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              En fazla 12 satır. Dahil değil işaretlenenler soluk görünür.
            </p>
          </div>
          <button
            type="button"
            disabled={features.length >= 12}
            onClick={() => setFeatures((prev) => [...prev, emptyFeature()])}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#f8f9fb] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Satır ekle
          </button>
        </div>

        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-[#e9ebec] p-3 sm:flex-row sm:items-center"
            >
              <input
                name="featureLabel[]"
                value={feature.label}
                onChange={(event) =>
                  updateFeature(index, { label: event.target.value })
                }
                placeholder="Özellik metni"
                className="min-w-0 flex-1 rounded-md border border-[#e9ebec] px-3 py-2 text-sm outline-none focus:border-[#405189]"
              />
              <input
                type="hidden"
                name="featureIncluded[]"
                value={feature.included ? "true" : "false"}
              />
              <AdminSwitch
                label="Dahil"
                checked={feature.included}
                onChange={(checked) =>
                  updateFeature(index, { included: checked })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setFeatures((prev) =>
                    prev.length <= 1
                      ? [emptyFeature()]
                      : prev.filter((_, i) => i !== index),
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Satırı sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Paketi oluştur" : "Kaydet"}
        </button>
        <Link
          href="/admin/pricing"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
