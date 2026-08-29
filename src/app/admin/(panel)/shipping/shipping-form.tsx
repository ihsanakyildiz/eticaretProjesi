"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, PlugZap, Save, Trash2, Upload } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  SHIPPING_CARRIER_PROVIDERS,
  isShippingCarrierProviderId,
  shippingCarrierProviderById,
  type ShippingCarrierProviderId,
} from "@/config/shipping-carriers";
import { slugify } from "@/lib/slug";
import {
  createShippingCarrierAction,
  updateShippingCarrierAction,
  type ShippingCarrierFormState,
} from "./actions";

const initialState: ShippingCarrierFormState = {};

export type ShippingCarrierFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  provider?: ShippingCarrierProviderId;
  trackingUrlTemplate?: string;
  website?: string;
  phone?: string;
  email?: string;
  logo?: string;
  notes?: string;
  sortOrder?: number;
  isActive?: boolean;
};

function applyProviderDefaults(
  providerId: ShippingCarrierProviderId,
  current: { name: string; website: string; trackingUrlTemplate: string },
  previousId: ShippingCarrierProviderId,
) {
  const next = shippingCarrierProviderById(providerId);
  const previous = shippingCarrierProviderById(previousId);
  return {
    name:
      !current.name.trim() || current.name === previous.defaultName
        ? next.defaultName
        : current.name,
    website:
      !current.website.trim() || current.website === previous.website
        ? next.website
        : current.website,
    trackingUrlTemplate:
      !current.trackingUrlTemplate.trim() ||
      current.trackingUrlTemplate === previous.trackingUrlTemplate
        ? next.trackingUrlTemplate
        : current.trackingUrlTemplate,
  };
}

export function ShippingCarrierForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ShippingCarrierFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createShippingCarrierAction : updateShippingCarrierAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [provider, setProvider] = useState<ShippingCarrierProviderId>(
    initial?.provider ?? "CUSTOM",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState(
    initial?.trackingUrlTemplate ?? "",
  );
  const [logo, setLogo] = useState(initial?.logo ?? "");
  const [preview, setPreview] = useState(initial?.logo ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const providerMeta = shippingCarrierProviderById(provider);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/shipping");
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
          <h2 className="text-base font-semibold text-slate-800">Firma bilgisi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bilinen bir kargo seçin veya özel firma tanımlayın. API bağlantısı sonraki adımda
            eklenecek.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="provider" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kargo sağlayıcısı
            </label>
            <select
              id="provider"
              name="provider"
              value={provider}
              onChange={(event) => {
                const raw = event.target.value;
                if (!isShippingCarrierProviderId(raw)) return;
                const nextId = raw;
                const filled = applyProviderDefaults(
                  nextId,
                  { name, website, trackingUrlTemplate },
                  provider,
                );
                setProvider(nextId);
                setName(filled.name);
                setWebsite(filled.website);
                setTrackingUrlTemplate(filled.trackingUrlTemplate);
                if (!slugTouched) setSlug(slugify(filled.name));
              }}
              className={inputClass}
            >
              {SHIPPING_CARRIER_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Firma adı *
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugify(next));
              }}
              placeholder="Örn. Yurtiçi Kargo"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="yurtici-kargo"
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
              description="Pasif firmalar siparişte seçilmez"
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Takip ve iletişim</h2>
          <p className="mt-1 text-sm text-slate-500">
            Takip adresinde {"{tracking}"} yerine gönderi numarası yazılır.
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="trackingUrlTemplate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Takip URL şablonu
            </label>
            <input
              id="trackingUrlTemplate"
              name="trackingUrlTemplate"
              value={trackingUrlTemplate}
              onChange={(event) => setTrackingUrlTemplate(event.target.value)}
              placeholder="https://ornek.com/takip?code={tracking}"
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
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://ornek.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              placeholder="destek@ornek.com"
              className={inputClass}
            />
            {state.fieldErrors?.email ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.email}</p>
            ) : null}
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
              placeholder="444 0 000"
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
                onChange={(event) => {
                  const file = event.target.files?.[0];
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
          <h2 className="text-base font-semibold text-slate-800">API entegrasyonu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sipariş oluşturma ve takip için API bağlanacak; kimlik bilgileri sonra eklenecek.
          </p>
        </div>
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#405189]/10 text-[#405189]">
            <PlugZap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {providerMeta.apiPlanned
                ? `${providerMeta.label} API’si henüz bağlı değil`
                : "Özel firmalar için API tanımı yok"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {providerMeta.apiPlanned
                ? "Bu sağlayıcı için gönderi oluşturma ve takip entegrasyonu sonraki aşamada eklenecek."
                : "Takip URL şablonunu doldurun. Özel API ihtiyacı olursa sağlayıcı olarak kaydedilebilir."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">İç notlar</h2>
          <p className="mt-1 text-sm text-slate-500">Yalnızca admin panelinde görünür</p>
        </div>
        <div className="p-5">
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            placeholder="Anlaşma kodu, özel fiyat, iç hatırlatmalar…"
            className={inputClass}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/shipping"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        <Can resource="shipping" action={mode === "create" ? "create" : "update"}>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === "create" ? "Kaydet" : "Güncelle"}
          </button>
        </Can>
      </div>
    </form>
  );
}
