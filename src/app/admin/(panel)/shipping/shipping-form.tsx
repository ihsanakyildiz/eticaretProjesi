"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
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
  testArasConnectionAction,
  testYurticiConnectionAction,
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
  apiUsername?: string;
  apiEnvironment?: "test" | "live";
  apiLanguage?: "TR" | "EN";
  apiCustomerCode?: string;
  apiHasPassword?: boolean;
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
  const [apiEnvironment, setApiEnvironment] = useState<"test" | "live">(
    initial?.apiEnvironment ?? "test",
  );
  const [apiUsername, setApiUsername] = useState(initial?.apiUsername ?? "");
  const [apiCustomerCode, setApiCustomerCode] = useState(initial?.apiCustomerCode ?? "");
  const [apiLanguage, setApiLanguage] = useState<"TR" | "EN">(initial?.apiLanguage ?? "TR");
  const showApiForm = provider === "YURTICI" || provider === "ARAS";
  const [apiTestMessage, setApiTestMessage] = useState<string | null>(null);
  const [apiTestError, setApiTestError] = useState<string | null>(null);
  const [isTesting, startTest] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
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
            Bilinen bir kargo seçin veya özel firma tanımlayın. Yurtiçi ve Aras Kargo için API
            kimlik bilgilerini aynı formdan girebilirsiniz.
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
            {provider === "YURTICI"
              ? "Yurtiçi Kargo SOAP (ShippingOrderDispatcherServices) kimlik bilgileri."
              : provider === "ARAS"
                ? "Aras Kargo SOAP (SetOrder / GetQueryJSON) kimlik bilgileri."
                : "Sipariş oluşturma ve takip için API bağlanacak."}
          </p>
        </div>
        {showApiForm ? (
          <div className="space-y-5 p-5">
            <div className="rounded-md border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {provider === "ARAS"
                ? "Şubenizden SetOrder kullanıcı adı ve şifresi alın. Takip için esasweb.araskargo.com.tr üzerinden XML servis kaydı yapıp GetQueryJSON yöntemini seçin; oradaki müşteri kodunu buraya yazın. Canlıya geçmeden önce çıkış IP adresinizi Aras’a bildirin."
                : "Kurumsal müşteri temsilcinizden web servis kullanıcı adı ve şifresi alın. Test ortamı için Yurtiçi’nin verdiği deneme hesabını (ör. YKTEST) kullanın. Canlıya geçmeden önce çıkış IP adresinizi Yurtiçi BT’ye bildirin."}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="apiEnvironment" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ortam
                </label>
                <select
                  id="apiEnvironment"
                  name="apiEnvironment"
                  value={apiEnvironment}
                  onChange={(event) =>
                    setApiEnvironment(event.target.value === "live" ? "live" : "test")
                  }
                  className={inputClass}
                >
                  <option value="test">Test</option>
                  <option value="live">Canlı</option>
                </select>
              </div>
              {provider === "YURTICI" ? (
                <div>
                  <label htmlFor="apiLanguage" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Servis dili
                  </label>
                  <select
                    id="apiLanguage"
                    name="apiLanguage"
                    value={apiLanguage}
                    onChange={(event) => setApiLanguage(event.target.value === "EN" ? "EN" : "TR")}
                    className={inputClass}
                  >
                    <option value="TR">Türkçe</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="apiCustomerCode" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Müşteri kodu
                  </label>
                  <input
                    id="apiCustomerCode"
                    name="apiCustomerCode"
                    value={apiCustomerCode}
                    onChange={(event) => setApiCustomerCode(event.target.value)}
                    autoComplete="off"
                    placeholder="Esasweb müşteri kodu"
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label htmlFor="apiUsername" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Web servis kullanıcı adı
                </label>
                <input
                  id="apiUsername"
                  name="apiUsername"
                  value={apiUsername}
                  onChange={(event) => setApiUsername(event.target.value)}
                  autoComplete="off"
                  placeholder={provider === "ARAS" ? "SetOrder kullanıcı adı" : "YKTEST veya satış kodunuz"}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="apiPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Web servis şifresi
                </label>
                <input
                  ref={passwordRef}
                  id="apiPassword"
                  name="apiPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={initial?.apiHasPassword ? "••••••••  (boş bırakın = değişmez)" : "Şifre"}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isTesting}
                onClick={() => {
                  setApiTestError(null);
                  setApiTestMessage(null);
                  startTest(async () => {
                    const result =
                      provider === "ARAS"
                        ? await testArasConnectionAction({
                            carrierId: initial?.id,
                            username: apiUsername,
                            password: passwordRef.current?.value ?? "",
                            customerCode: apiCustomerCode,
                            environment: apiEnvironment,
                          })
                        : await testYurticiConnectionAction({
                            carrierId: initial?.id,
                            username: apiUsername,
                            password: passwordRef.current?.value ?? "",
                            environment: apiEnvironment,
                            language: apiLanguage,
                          });
                    if (result.error) {
                      setApiTestError(result.error);
                      return;
                    }
                    setApiTestMessage(result.message ?? "Bağlantı başarılı.");
                  });
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[#405189] px-3 py-2 text-sm font-semibold text-[#405189] hover:bg-[#405189]/5 disabled:opacity-60"
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                Bağlantıyı dene
              </button>
              {initial?.apiHasPassword ? (
                <p className="text-xs text-slate-500">Kayıtlı şifre var. Yeni şifre yazmazsanız korunur.</p>
              ) : null}
            </div>
            {apiTestError ? (
              <p className="text-sm text-rose-600">{apiTestError}</p>
            ) : null}
            {apiTestMessage ? (
              <p className="text-sm text-emerald-700">{apiTestMessage}</p>
            ) : null}
          </div>
        ) : (
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
        )}
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
