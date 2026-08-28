"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardLayout, CardType } from "@prisma/client";
import {
  ImageIcon,
  Loader2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { LucideIconPicker } from "@/components/admin/lucide-icon-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { CARD_LAYOUT_OPTIONS, parseCardFeatures } from "@/lib/cards";
import {
  createCardAction,
  updateCardAction,
  type CardFormState,
} from "./actions";

const initialState: CardFormState = {};

type PageOption = {
  id: string;
  label: string;
  depth: number;
  href: string;
};

export type CardFormValues = {
  id?: string;
  type?: CardType;
  title?: string;
  badgeText?: string | null;
  subtitle?: string | null;
  description?: string | null;
  features?: string | null;
  layout?: CardLayout;
  mediaType?: "IMAGE" | "ICON";
  image?: string | null;
  icon?: string | null;
  showFrame?: boolean;
  showSparkles?: boolean;
  videoLabel?: string | null;
  videoUrl?: string | null;
  profileName?: string | null;
  profileRole?: string | null;
  profileImage?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
  href?: string;
  sortOrder?: number;
  isActive?: boolean;
};

const LAYOUT_ICONS: Record<CardLayout, typeof PanelLeft> = {
  MEDIA_LEFT: PanelLeft,
  MEDIA_RIGHT: PanelRight,
  MEDIA_TOP: PanelTop,
  MEDIA_BOTTOM: PanelBottom,
};

export function CardForm({
  mode,
  cardType,
  initial,
  pageOptions = [],
}: {
  mode: "create" | "edit";
  cardType: CardType;
  initial?: CardFormValues;
  pageOptions?: PageOption[];
}) {
  const router = useRouter();
  const action = mode === "create" ? createCardAction : updateCardAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [badgeText, setBadgeText] = useState(initial?.badgeText ?? "Neden Biz");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState<string[]>(() => {
    const parsed = parseCardFeatures(initial?.features);
    return parsed.length > 0 ? parsed : [""];
  });
  const [layout, setLayout] = useState<CardLayout>(
    initial?.layout ?? "MEDIA_LEFT",
  );
  const [mediaType, setMediaType] = useState<"IMAGE" | "ICON">(
    cardType === "ADVANCED" ? "IMAGE" : (initial?.mediaType ?? "ICON"),
  );
  const [icon, setIcon] = useState(initial?.icon ?? "LayoutGrid");
  const [href, setHref] = useState(initial?.href ?? (cardType === "ADVANCED" ? "#" : ""));
  const [pageId, setPageId] = useState("");
  const [image, setImage] = useState(initial?.image ?? "");
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState(initial?.profileImage ?? "");
  const [profilePreview, setProfilePreview] = useState(
    initial?.profileImage ?? "",
  );
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [videoLabel, setVideoLabel] = useState(
    initial?.videoLabel ?? "Video Rehber",
  );
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [profileName, setProfileName] = useState(initial?.profileName ?? "");
  const [profileRole, setProfileRole] = useState(initial?.profileRole ?? "");
  const [statValue, setStatValue] = useState(initial?.statValue ?? "+12");
  const [statLabel, setStatLabel] = useState(
    initial?.statLabel ?? "Yıllık deneyim",
  );
  const [showFrame, setShowFrame] = useState(initial?.showFrame ?? true);
  const [showSparkles, setShowSparkles] = useState(
    initial?.showSparkles ?? true,
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/cards");
      router.refresh();
    }
  }, [state.success, router]);

  const selectOptions = useMemo(
    () =>
      pageOptions.map((page) => ({
        id: page.id,
        label: page.label,
        depth: page.depth,
      })),
    [pageOptions],
  );

  const onPageChange = (id: string) => {
    setPageId(id);
    const selected = pageOptions.find((page) => page.id === id);
    if (selected) setHref(selected.href);
  };

  const submitAction = (formData: FormData) => {
    formData.delete("image_file");
    formData.delete("profile_image_file");
    if (imageFile) formData.append("image_file", imageFile);
    if (profileImageFile) formData.append("profile_image_file", profileImageFile);
    formAction(formData);
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  const isAdvanced = cardType === "ADVANCED";

  return (
    <form action={submitAction} className="space-y-6">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <input type="hidden" name="type" value={cardType} />
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="profileImage" value={profileImage} />
      <input type="hidden" name="mediaType" value={mediaType} />
      <input type="hidden" name="layout" value={layout} />
      <input type="hidden" name="icon" value={icon} />

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">
              {isAdvanced ? "Gelişmiş Kart" : "Klasik Kart"}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isAdvanced
                  ? "bg-[#405189]/10 text-[#405189]"
                  : "bg-[#0ab39c]/10 text-[#0ab39c]"
              }`}
            >
              {isAdvanced ? "Split / Why Us" : "Hizmet kartı"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isAdvanced
              ? "Görsel yerleşimi, zengin açıklama, özellik listesi ve profil / istatistik alanı"
              : "Başlık, görsel veya ikon ve tıklanınca açılacak sayfa"}
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className={isAdvanced ? "" : "md:col-span-2"}>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
              {isAdvanced ? "Bölüm başlığı *" : "Kart başlığı *"}
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isAdvanced
                  ? "Örn. Büyük ve küçük organizasyonlara çözüm üretiyoruz"
                  : "Örn. Web Tasarım"
              }
              className={inputClass}
            />
            {state.fieldErrors?.title ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.title}</p>
            ) : null}
          </div>

          {isAdvanced ? (
            <div>
              <label
                htmlFor="badgeText"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Rozet metni
              </label>
              <input
                id="badgeText"
                name="badgeText"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Neden Biz"
                className={inputClass}
              />
            </div>
          ) : null}

          {isAdvanced ? (
            <div className="md:col-span-2">
              <label
                htmlFor="subtitle"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                İçerik başlığı
              </label>
              <input
                id="subtitle"
                name="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Örn. Dijital hayallerinizi gerçeğe dönüştürüyoruz"
                className={inputClass}
              />
              {state.fieldErrors?.subtitle ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {state.fieldErrors.subtitle}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Açıklama (yazı editörü)
            </p>
            <RichTextEditor
              name="description"
              value={description}
              onChange={setDescription}
              variant="compact"
              placeholder={
                isAdvanced
                  ? "Kısa tanıtım metnini yazın…"
                  : "Kartın kısa açıklamasını yazın…"
              }
            />
          </div>

          {isAdvanced ? (
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Yerleşim (görsel konumu)
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CARD_LAYOUT_OPTIONS.map((option) => {
                  const Icon = LAYOUT_ICONS[option.value];
                  const active = layout === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLayout(option.value)}
                      className={`rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-[#0ab39c] bg-[#0ab39c]/10 ring-2 ring-[#0ab39c]/20"
                          : "border-[#e9ebec] hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`mb-2 h-5 w-5 ${
                          active ? "text-[#0ab39c]" : "text-slate-400"
                        }`}
                      />
                      <p className="text-sm font-semibold text-slate-800">
                        {option.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!isAdvanced ? (
            <div className="md:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Görsel kaynağı *
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMediaType("ICON")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    mediaType === "ICON"
                      ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                      : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ücretsiz ikon (Lucide)
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType("IMAGE")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    mediaType === "IMAGE"
                      ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                      : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Görsel yükle
                </button>
              </div>
            </div>
          ) : null}

          {!isAdvanced && mediaType === "ICON" ? (
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">İkon seçimi</p>
              <LucideIconPicker value={icon} onChange={setIcon} />
              {state.fieldErrors?.icon ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {state.fieldErrors.icon}
                </p>
              ) : null}
            </div>
          ) : null}

          {isAdvanced || mediaType === "IMAGE" ? (
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">
                {isAdvanced ? "Ana görsel" : "Kart görseli"}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-36 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
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
                      Görsel Seç
                    </button>
                    {preview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setImage("");
                          setPreview("");
                          setImageFile(null);
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
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-xs text-slate-400">PNG, JPG veya WEBP</p>
                  {state.fieldErrors?.image ? (
                    <p className="text-xs text-rose-600">
                      {state.fieldErrors.image}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isAdvanced ? (
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">
                  Özellik listesi (madde işaretleri)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFeatures((prev) =>
                      prev.length >= 12 ? prev : [...prev, ""],
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Madde ekle
                </button>
              </div>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={`feature-${index}`} className="flex gap-2">
                    <input
                      name="features[]"
                      value={feature}
                      onChange={(e) => {
                        const next = [...features];
                        next[index] = e.target.value;
                        setFeatures(next);
                      }}
                      placeholder={`Özellik ${index + 1}`}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFeatures((prev) =>
                          prev.length <= 1
                            ? [""]
                            : prev.filter((_, i) => i !== index),
                        )
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                      aria-label="Maddeyi sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isAdvanced ? (
            <>
              <div>
                <label
                  htmlFor="videoLabel"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Görsel üzeri buton metni
                </label>
                <input
                  id="videoLabel"
                  name="videoLabel"
                  value={videoLabel}
                  onChange={(e) => setVideoLabel(e.target.value)}
                  placeholder="Video Rehber"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="videoUrl"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Buton linki / video URL
                </label>
                <input
                  id="videoUrl"
                  name="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://... veya /sayfa"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-4">
                <AdminSwitch
                  name="showFrame"
                  label="Mor çerçeve"
                  checked={showFrame}
                  onChange={setShowFrame}
                />
                <AdminSwitch
                  name="showSparkles"
                  label="Köşe yıldızları"
                  checked={showSparkles}
                  onChange={setShowSparkles}
                />
              </div>

              <div className="md:col-span-2 border-t border-[#e9ebec] pt-5">
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Alt profil & istatistik
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profileName"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      İsim
                    </label>
                    <input
                      id="profileName"
                      name="profileName"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="İhsan Akyıldız"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profileRole"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Unvan
                    </label>
                    <input
                      id="profileRole"
                      name="profileRole"
                      value={profileRole}
                      onChange={(e) => setProfileRole(e.target.value)}
                      placeholder="Kurucu & Direktör"
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Profil fotoğrafı
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                        {profilePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profilePreview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => profileFileRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Upload className="h-4 w-4" />
                            Fotoğraf Seç
                          </button>
                          {profilePreview ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProfileImage("");
                                setProfilePreview("");
                                setProfileImageFile(null);
                                if (profileFileRef.current) {
                                  profileFileRef.current.value = "";
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Kaldır
                            </button>
                          ) : null}
                        </div>
                        <input
                          ref={profileFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setProfileImageFile(file);
                            setProfilePreview(URL.createObjectURL(file));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="statValue"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      İstatistik değeri
                    </label>
                    <input
                      id="statValue"
                      name="statValue"
                      value={statValue}
                      onChange={(e) => setStatValue(e.target.value)}
                      placeholder="+12"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="statLabel"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      İstatistik etiketi
                    </label>
                    <input
                      id="statLabel"
                      name="statLabel"
                      value={statLabel}
                      onChange={(e) => setStatLabel(e.target.value)}
                      placeholder="Yıllık deneyim"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {!isAdvanced ? (
            <>
              <div className="md:col-span-2">
                <label
                  htmlFor="pagePick"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  CMS sayfasından seç (opsiyonel)
                </label>
                <SearchableSelect
                  id="pagePick"
                  name="pagePick"
                  value={pageId}
                  onChange={onPageChange}
                  options={selectOptions}
                  placeholder="Sayfa ara veya seçin…"
                  emptyLabel="— Elle link yazacağım —"
                  searchPlaceholder="Sayfa ara…"
                  noResultsLabel="Eşleşen sayfa yok"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="href"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Açılacak sayfa linki *
                </label>
                <input
                  id="href"
                  name="href"
                  required
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="/hakkimizda veya https://..."
                  className={inputClass}
                />
                {state.fieldErrors?.href ? (
                  <p className="mt-1.5 text-xs text-rose-600">
                    {state.fieldErrors.href}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <input type="hidden" name="href" value={href || "#"} />
          )}

          <div>
            <label
              htmlFor="sortOrder"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
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
              defaultChecked={initial?.isActive ?? true}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/cards"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Kartı Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
