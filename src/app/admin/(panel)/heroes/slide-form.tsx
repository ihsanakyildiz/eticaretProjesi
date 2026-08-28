"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ImageIcon,
  Loader2,
  Palette,
  Save,
  Trash2,
  Type,
  Upload,
  Users,
} from "lucide-react";
import {
  DEFAULT_HERO_SLIDE,
  HERO_BACKGROUND_STYLES,
  HERO_LAYOUTS,
  HERO_MEDIA_LIMITS,
  type HeroMediaKindValue,
} from "@/lib/heroes";
import {
  createHeroSlideAction,
  updateHeroSlideAction,
  type HeroFormState,
} from "./actions";
import { HeroSlidePreview } from "./slide-preview";

const initialState: HeroFormState = {};

type MediaItem = {
  key: string;
  id?: string;
  kind: HeroMediaKindValue;
  preview: string;
  file?: File;
  label: string;
  alt: string;
  href: string;
};

type SlideFormValues = {
  id?: string;
  label?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  badgeText?: string | null;
  badgeIcon?: string | null;
  kicker?: string | null;
  headline?: string;
  headlineAccent?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryUrl?: string | null;
  trustLabel?: string | null;
  overlayPercent?: number;
  titleColor?: string;
  accentColor?: string;
  subtitleColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  titleFont?: string | null;
  titleSizePx?: number | null;
  subtitleSizePx?: number | null;
  imageWidthPx?: number | null;
  imageHeightPx?: number | null;
  layout?: string;
  backgroundStyle?: string;
  backgroundImage?: string | null;
  themeColor?: string | null;
  showStars?: boolean;
  starCount?: number;
  showAvatars?: boolean;
  media?: {
    id: string;
    kind: HeroMediaKindValue;
    image: string;
    label: string | null;
    alt: string | null;
    href: string | null;
  }[];
};

type TabId = "appearance" | "texts" | "references" | "media" | "preview";

const TABS: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Görünüm", icon: Palette },
  { id: "texts", label: "Metinler", icon: Type },
  { id: "references", label: "Referanslar", icon: ImageIcon },
  { id: "media", label: "Medya", icon: Users },
  { id: "preview", label: "Önizleme", icon: Eye },
];

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-[#e9ebec] bg-white p-1"
        />
        <input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
        />
      </div>
    </div>
  );
}

function MediaListEditor({
  title,
  hint,
  kind,
  items,
  onChange,
  showMeta,
}: {
  title: string;
  hint: string;
  kind: HeroMediaKindValue;
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  showMeta?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = HERO_MEDIA_LIMITS[kind];
  const kindItems = items.filter((item) => item.kind === kind);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...kindItems];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    let cursor = 0;
    onChange(items.map((item) => (item.kind === kind ? next[cursor++] : item)));
  };

  const updateItem = (key: string, patch: Partial<MediaItem>) => {
    onChange(
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
        <span className="text-xs text-slate-400">
          {kindItems.length} / {limit}
        </span>
      </div>

      {kindItems.length > 0 ? (
        <div className="mb-3 space-y-3">
          {kindItems.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-col gap-3 rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-3 sm:flex-row"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt=""
                className={`rounded-md object-cover ${
                  kind === "AVATAR" ? "h-14 w-14 rounded-full" : "h-16 w-24"
                } bg-white`}
              />
              <div className="min-w-0 flex-1 space-y-2">
                {showMeta ? (
                  <>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(item.key, { label: e.target.value })}
                      placeholder="Marka / etiket"
                      className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm outline-none focus:border-[#0ab39c]"
                    />
                    <input
                      type="url"
                      value={item.href}
                      onChange={(e) => updateItem(item.key, { href: e.target.value })}
                      placeholder="Bağlantı (opsiyonel)"
                      className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm outline-none focus:border-[#0ab39c]"
                    />
                  </>
                ) : (
                  <input
                    type="text"
                    value={item.alt}
                    onChange={(e) => updateItem(item.key, { alt: e.target.value })}
                    placeholder="Alt metin"
                    className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm outline-none focus:border-[#0ab39c]"
                  />
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] bg-white text-slate-500 disabled:opacity-40"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === kindItems.length - 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] bg-white text-slate-500 disabled:opacity-40"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((row) => row.key !== item.key))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-slate-500">Henüz eklenmedi.</p>
      )}

      <button
        type="button"
        disabled={kindItems.length >= limit}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        <Upload className="h-4 w-4" />
        Ekle
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          const room = limit - kindItems.length;
          const accepted = files.slice(0, room).map((file) => ({
            key: `new-${kind}-${crypto.randomUUID()}`,
            kind,
            preview: URL.createObjectURL(file),
            file,
            label: "",
            alt: "",
            href: "",
          }));
          onChange([...items, ...accepted]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function HeroSlideForm({
  mode,
  heroId,
  heroName,
  initial,
}: {
  mode: "create" | "edit";
  heroId: string;
  heroName: string;
  initial?: SlideFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createHeroSlideAction : updateHeroSlideAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [tab, setTab] = useState<TabId>("texts");

  const defaults = DEFAULT_HERO_SLIDE;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [badgeText, setBadgeText] = useState(initial?.badgeText ?? defaults.badgeText);
  const [badgeIcon, setBadgeIcon] = useState(initial?.badgeIcon ?? defaults.badgeIcon);
  const [kicker, setKicker] = useState(
    initial?.kicker ?? (mode === "create" ? defaults.kicker : ""),
  );
  const [headline, setHeadline] = useState(initial?.headline ?? defaults.headline);
  const [headlineAccent, setHeadlineAccent] = useState(
    initial?.headlineAccent ?? defaults.headlineAccent,
  );
  const [subheadline, setSubheadline] = useState(
    initial?.subheadline ?? defaults.subheadline,
  );
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? defaults.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? defaults.ctaUrl);
  const [ctaSecondaryLabel, setCtaSecondaryLabel] = useState(
    initial?.ctaSecondaryLabel ?? (mode === "create" ? defaults.ctaSecondaryLabel : ""),
  );
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState(
    initial?.ctaSecondaryUrl ?? (mode === "create" ? defaults.ctaSecondaryUrl : ""),
  );
  const [trustLabel, setTrustLabel] = useState(initial?.trustLabel ?? defaults.trustLabel);
  const [overlayPercent, setOverlayPercent] = useState(initial?.overlayPercent ?? 0);
  const [titleColor, setTitleColor] = useState(initial?.titleColor ?? defaults.titleColor);
  const [accentColor, setAccentColor] = useState(initial?.accentColor ?? defaults.accentColor);
  const [subtitleColor, setSubtitleColor] = useState(
    initial?.subtitleColor ?? defaults.subtitleColor,
  );
  const [ctaBgColor, setCtaBgColor] = useState(initial?.ctaBgColor ?? defaults.ctaBgColor);
  const [ctaTextColor, setCtaTextColor] = useState(
    initial?.ctaTextColor ?? defaults.ctaTextColor,
  );
  const [titleFont, setTitleFont] = useState(initial?.titleFont ?? "");
  const [titleSizePx, setTitleSizePx] = useState(
    initial?.titleSizePx != null ? String(initial.titleSizePx) : "",
  );
  const [subtitleSizePx, setSubtitleSizePx] = useState(
    initial?.subtitleSizePx != null ? String(initial.subtitleSizePx) : "",
  );
  const [imageWidthPx, setImageWidthPx] = useState(
    initial?.imageWidthPx != null ? String(initial.imageWidthPx) : "",
  );
  const [imageHeightPx, setImageHeightPx] = useState(
    initial?.imageHeightPx != null ? String(initial.imageHeightPx) : "",
  );
  const [layout, setLayout] = useState(initial?.layout ?? defaults.layout);
  const [backgroundStyle, setBackgroundStyle] = useState(
    initial?.backgroundStyle ?? defaults.backgroundStyle,
  );
  const [backgroundImage, setBackgroundImage] = useState(initial?.backgroundImage ?? "");
  const [backgroundPreview, setBackgroundPreview] = useState(initial?.backgroundImage ?? "");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const [themeColor, setThemeColor] = useState(initial?.themeColor ?? defaults.themeColor);
  const [showStars, setShowStars] = useState(initial?.showStars ?? true);
  const [starCount, setStarCount] = useState(initial?.starCount ?? 5);
  const [showAvatars, setShowAvatars] = useState(initial?.showAvatars ?? true);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(
    mode === "create" && initial?.sortOrder === undefined
      ? ""
      : String(initial?.sortOrder ?? 0),
  );
  const [media, setMedia] = useState<MediaItem[]>(() =>
    (initial?.media ?? []).map((item) => ({
      key: item.id,
      id: item.id,
      kind: item.kind,
      preview: item.image,
      label: item.label ?? "",
      alt: item.alt ?? "",
      href: item.href ?? "",
    })),
  );

  useEffect(() => {
    if (!state.success) return;
    const redirectHeroId = state.fieldErrors?.redirectHeroId ?? heroId;
    router.push(`/admin/heroes/${redirectHeroId}/edit`);
    router.refresh();
  }, [state.success, state.fieldErrors, heroId, router]);

  const mediaOrderJson = useMemo(() => {
    const newFiles: File[] = [];
    const order = media.map((item) => {
      if (item.id) {
        return {
          type: "existing" as const,
          id: item.id,
          kind: item.kind,
          label: item.label,
          alt: item.alt,
          href: item.href,
        };
      }
      const index = newFiles.length;
      if (item.file) newFiles.push(item.file);
      return {
        type: "new" as const,
        index,
        kind: item.kind,
        label: item.label,
        alt: item.alt,
        href: item.href,
      };
    });
    return { orderJson: JSON.stringify(order), newFiles };
  }, [media]);

  const submitAction = (formData: FormData) => {
    formData.delete("media_files");
    formData.delete("background_image_file");
    for (const file of mediaOrderJson.newFiles) {
      formData.append("media_files", file);
    }
    if (backgroundFile) {
      formData.append("background_image_file", backgroundFile);
    }
    formAction(formData);
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={submitAction} className="space-y-6">
      <input type="hidden" name="heroId" value={heroId} />
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="media_order" value={mediaOrderJson.orderJson} />
      <input type="hidden" name="backgroundImage" value={backgroundImage} />

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#e9ebec] bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[#405189] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "appearance" ? (
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Görünüm</h2>
            <p className="mt-1 text-sm text-slate-500">
              {heroName} — renkler, tipografi, layout ve overlay
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <label htmlFor="layout" className="mb-1.5 block text-sm font-medium text-slate-700">
                Layout
              </label>
              <select
                id="layout"
                name="layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className={inputClass}
              >
                {HERO_LAYOUTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="backgroundStyle"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Arka plan stili
              </label>
              <select
                id="backgroundStyle"
                name="backgroundStyle"
                value={backgroundStyle}
                onChange={(e) => setBackgroundStyle(e.target.value)}
                className={inputClass}
              >
                {HERO_BACKGROUND_STYLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Arka plan görseli</p>
              <p className="mb-3 text-xs text-slate-400">
                İsteğe bağlı. Yüklenirse stil (ızgara / gradient) görselin üzerinde uygulanır;
                koyuluk kaydırıcısı da bu görsele etki eder.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-full max-w-xs shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                  {backgroundPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={backgroundPreview}
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
                      onClick={() => backgroundFileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" />
                      Görsel Seç
                    </button>
                    {backgroundPreview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundImage("");
                          setBackgroundPreview("");
                          setBackgroundFile(null);
                          if (backgroundFileRef.current) backgroundFileRef.current.value = "";
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Kaldır
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={backgroundFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBackgroundFile(file);
                      setBackgroundPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-xs text-slate-400">
                    PNG, JPG veya WEBP — kayıtta WebP’ye çevrilir.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Fotoğraf üzeri koyuluk: {overlayPercent}%
              </label>
              <input type="hidden" name="overlayPercent" value={overlayPercent} />
              <input
                type="range"
                min={0}
                max={80}
                value={overlayPercent}
                onChange={(e) => setOverlayPercent(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <ColorField
              id="titleColor"
              name="titleColor"
              label="Başlık (vurgudan önce) renk"
              value={titleColor}
              onChange={setTitleColor}
            />
            <ColorField
              id="accentColor"
              name="accentColor"
              label="Başlık vurgu renk"
              value={accentColor}
              onChange={setAccentColor}
            />
            <ColorField
              id="subtitleColor"
              name="subtitleColor"
              label="Alt açıklama renk"
              value={subtitleColor}
              onChange={setSubtitleColor}
            />
            <ColorField
              id="themeColor"
              name="themeColor"
              label="Tema / grid renk"
              value={themeColor}
              onChange={setThemeColor}
            />
            <ColorField
              id="ctaBgColor"
              name="ctaBgColor"
              label="CTA arka plan"
              value={ctaBgColor}
              onChange={setCtaBgColor}
            />
            <ColorField
              id="ctaTextColor"
              name="ctaTextColor"
              label="CTA yazı renk"
              value={ctaTextColor}
              onChange={setCtaTextColor}
            />

            <div className="md:col-span-2">
              <label htmlFor="titleFont" className="mb-1.5 block text-sm font-medium text-slate-700">
                Başlık font family (CSS)
              </label>
              <input
                id="titleFont"
                name="titleFont"
                value={titleFont}
                onChange={(e) => setTitleFont(e.target.value)}
                placeholder="Inter, system-ui, sans-serif"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="titleSizePx" className="mb-1.5 block text-sm font-medium text-slate-700">
                Başlık font boyutu (px, boş=otomatik)
              </label>
              <input
                id="titleSizePx"
                name="titleSizePx"
                value={titleSizePx}
                onChange={(e) => setTitleSizePx(e.target.value)}
                placeholder="auto"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="subtitleSizePx"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Alt açıklama font boyutu (px, boş=otomatik)
              </label>
              <input
                id="subtitleSizePx"
                name="subtitleSizePx"
                value={subtitleSizePx}
                onChange={(e) => setSubtitleSizePx(e.target.value)}
                placeholder="auto"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="imageWidthPx" className="mb-1.5 block text-sm font-medium text-slate-700">
                Görsel genişliği (px, boş=otomatik)
              </label>
              <input
                id="imageWidthPx"
                name="imageWidthPx"
                value={imageWidthPx}
                onChange={(e) => setImageWidthPx(e.target.value)}
                placeholder="auto"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="imageHeightPx"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Görsel yüksekliği (px, boş=otomatik)
              </label>
              <input
                id="imageHeightPx"
                name="imageHeightPx"
                value={imageHeightPx}
                onChange={(e) => setImageHeightPx(e.target.value)}
                placeholder="auto"
                className={inputClass}
              />
            </div>
          </div>
        </section>
      ) : null}

      {tab === "texts" ? (
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Metinler</h2>
            <p className="mt-1 text-sm text-slate-500">Badge, başlık, CTA ve güven metni</p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <label htmlFor="label" className="mb-1.5 block text-sm font-medium text-slate-700">
                Admin etiketi
              </label>
              <input
                id="label"
                name="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Slayt 1"
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <AdminSwitch
                label="Aktif slayt"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
            <div>
              <label htmlFor="badgeText" className="mb-1.5 block text-sm font-medium text-slate-700">
                Badge metni
              </label>
              <input
                id="badgeText"
                name="badgeText"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="badgeIcon" className="mb-1.5 block text-sm font-medium text-slate-700">
                Badge ikon anahtarı
              </label>
              <input
                id="badgeIcon"
                name="badgeIcon"
                value={badgeIcon}
                onChange={(e) => setBadgeIcon(e.target.value)}
                placeholder="rocket"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="kicker" className="mb-1.5 block text-sm font-medium text-slate-700">
                Üst başlık
              </label>
              <input
                id="kicker"
                name="kicker"
                value={kicker}
                onChange={(e) => setKicker(e.target.value)}
                placeholder="İhsan Akyıldız"
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Badge’in altındaki renkli satır. Boş bırakılırsa gösterilmez. Site adından bağımsızdır.
              </p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="headline" className="mb-1.5 block text-sm font-medium text-slate-700">
                Başlık *
              </label>
              <input
                id="headline"
                name="headline"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="headlineAccent"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Vurgulu metin (başlık içinde)
              </label>
              <input
                id="headlineAccent"
                name="headlineAccent"
                value={headlineAccent}
                onChange={(e) => setHeadlineAccent(e.target.value)}
                placeholder="Infinia."
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="subheadline" className="mb-1.5 block text-sm font-medium text-slate-700">
                Alt açıklama
              </label>
              <textarea
                id="subheadline"
                name="subheadline"
                rows={3}
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </div>
            <div>
              <label htmlFor="ctaLabel" className="mb-1.5 block text-sm font-medium text-slate-700">
                CTA metni
              </label>
              <input
                id="ctaLabel"
                name="ctaLabel"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ctaUrl" className="mb-1.5 block text-sm font-medium text-slate-700">
                CTA bağlantısı
              </label>
              <input
                id="ctaUrl"
                name="ctaUrl"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/iletisim"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ctaSecondaryLabel" className="mb-1.5 block text-sm font-medium text-slate-700">
                İkinci buton metni
              </label>
              <input
                id="ctaSecondaryLabel"
                name="ctaSecondaryLabel"
                value={ctaSecondaryLabel}
                onChange={(e) => setCtaSecondaryLabel(e.target.value)}
                placeholder="Projeleri İncele"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ctaSecondaryUrl" className="mb-1.5 block text-sm font-medium text-slate-700">
                İkinci buton bağlantısı
              </label>
              <input
                id="ctaSecondaryUrl"
                name="ctaSecondaryUrl"
                value={ctaSecondaryUrl}
                onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                placeholder="/projeler"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="trustLabel" className="mb-1.5 block text-sm font-medium text-slate-700">
                Güven / referans başlığı
              </label>
              <input
                id="trustLabel"
                name="trustLabel"
                value={trustLabel}
                onChange={(e) => setTrustLabel(e.target.value)}
                placeholder="Trusted by the best"
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
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Boş = otomatik"
                className={inputClass}
              />
            </div>
          </div>
        </section>
      ) : null}

      {tab === "references" ? (
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Referanslar</h2>
            <p className="mt-1 text-sm text-slate-500">
              “Trusted by” logosunu buradan yönetin
            </p>
          </div>
          <div className="p-5">
            <MediaListEditor
              title="Marka logoları"
              hint="PNG / SVG önerilir"
              kind="LOGO"
              items={media}
              onChange={setMedia}
              showMeta
            />
          </div>
        </section>
      ) : null}

      {tab === "media" ? (
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Medya & Sosyal kanıt</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kolaj görselleri, avatarlar ve yıldız puanı
            </p>
          </div>
          <div className="space-y-8 p-5">
            <MediaListEditor
              title="Kolaj görselleri"
              hint="Sağ taraftaki portre / görsel kolajı"
              kind="COLLAGE"
              items={media}
              onChange={setMedia}
            />
            <MediaListEditor
              title="Avatarlar"
              hint="Küçük yuvarlak profil görselleri"
              kind="AVATAR"
              items={media}
              onChange={setMedia}
            />
            <div className="grid gap-4 rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-4 md:grid-cols-2">
              <AdminSwitch
                label="Avatar grubunu göster"
                checked={showAvatars}
                onChange={setShowAvatars}
              />
              <AdminSwitch
                label="Yıldız puanını göster"
                checked={showStars}
                onChange={setShowStars}
              />
              <div>
                <label htmlFor="starCount" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Yıldız sayısı
                </label>
                <input
                  id="starCount"
                  name="starCount"
                  type="number"
                  min={1}
                  max={5}
                  value={starCount}
                  onChange={(e) => setStarCount(Number(e.target.value) || 5)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "preview" ? (
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="border-b border-[#e9ebec] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Önizleme</h2>
            <p className="mt-1 text-sm text-slate-500">
              Anlık admin önizlemesi — frontend birebir stil daha sonra bağlanacak
            </p>
          </div>
          <div className="p-5">
            <HeroSlidePreview
              badgeText={badgeText}
              badgeIcon={badgeIcon}
              headline={headline}
              headlineAccent={headlineAccent}
              kicker={kicker}
              subheadline={subheadline}
              ctaLabel={ctaLabel}
              ctaSecondaryLabel={ctaSecondaryLabel}
              trustLabel={trustLabel}
              titleColor={titleColor}
              accentColor={accentColor}
              subtitleColor={subtitleColor}
              ctaBgColor={ctaBgColor}
              ctaTextColor={ctaTextColor}
              titleFont={titleFont}
              titleSizePx={titleSizePx}
              subtitleSizePx={subtitleSizePx}
              overlayPercent={overlayPercent}
              backgroundStyle={backgroundStyle}
              backgroundImage={backgroundPreview}
              layout={layout}
              showStars={showStars}
              starCount={starCount}
              showAvatars={showAvatars}
              logos={media.filter((item) => item.kind === "LOGO")}
              collage={media.filter((item) => item.kind === "COLLAGE")}
              avatars={media.filter((item) => item.kind === "AVATAR")}
            />
          </div>
        </section>
      ) : null}

      {/* Keep uncontrolled-ish fields present when tab hidden */}
      {tab !== "appearance" ? (
        <>
          <input type="hidden" name="layout" value={layout} />
          <input type="hidden" name="backgroundStyle" value={backgroundStyle} />
          <input type="hidden" name="overlayPercent" value={overlayPercent} />
          <input type="hidden" name="titleColor" value={titleColor} />
          <input type="hidden" name="accentColor" value={accentColor} />
          <input type="hidden" name="subtitleColor" value={subtitleColor} />
          <input type="hidden" name="themeColor" value={themeColor} />
          <input type="hidden" name="ctaBgColor" value={ctaBgColor} />
          <input type="hidden" name="ctaTextColor" value={ctaTextColor} />
          <input type="hidden" name="titleFont" value={titleFont} />
          <input type="hidden" name="titleSizePx" value={titleSizePx} />
          <input type="hidden" name="subtitleSizePx" value={subtitleSizePx} />
          <input type="hidden" name="imageWidthPx" value={imageWidthPx} />
          <input type="hidden" name="imageHeightPx" value={imageHeightPx} />
        </>
      ) : null}
      {tab !== "texts" ? (
        <>
          <input type="hidden" name="label" value={label} />
          <input type="hidden" name="badgeText" value={badgeText} />
          <input type="hidden" name="badgeIcon" value={badgeIcon} />
          <input type="hidden" name="kicker" value={kicker} />
          <input type="hidden" name="headline" value={headline} />
          <input type="hidden" name="headlineAccent" value={headlineAccent} />
          <input type="hidden" name="subheadline" value={subheadline} />
          <input type="hidden" name="ctaLabel" value={ctaLabel} />
          <input type="hidden" name="ctaUrl" value={ctaUrl} />
          <input type="hidden" name="ctaSecondaryLabel" value={ctaSecondaryLabel} />
          <input type="hidden" name="ctaSecondaryUrl" value={ctaSecondaryUrl} />
          <input type="hidden" name="trustLabel" value={trustLabel} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
        </>
      ) : null}
      {tab !== "media" ? (
        <input type="hidden" name="starCount" value={starCount} />
      ) : null}
      <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
      <input type="hidden" name="showAvatars" value={showAvatars ? "true" : "false"} />
      <input type="hidden" name="showStars" value={showStars ? "true" : "false"} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/heroes/${heroId}/edit`}
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hero Alanına Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Slaytı Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
