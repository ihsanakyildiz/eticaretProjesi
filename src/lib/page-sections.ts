import type { PageSectionType } from "@prisma/client";
import {
  getDefaultContactFormConfig,
  parseContactFormConfig,
  type ContactFormConfig,
} from "@/config/contact-form";
import {
  getDefaultContactInfoBlockConfig,
  parseContactInfoBlockConfig,
  type ContactInfoBlockConfig,
} from "@/config/contact-info-block";
import {
  getDefaultGridRowConfig,
  parseGridColPlacement,
  parseGridRowConfig,
  type GridColPlacement,
  type GridRowConfig,
} from "@/config/page-grid";

export const PAGE_SECTION_TYPES = [
  "HERO",
  "TRUSTED_CLIENTS",
  "CARDS",
  "ADVANCED_CARD",
  "PROJECTS",
  "WORKS",
  "BLOG",
  "FAQ",
  "RICH_TEXT",
  "PRICING",
  "CTA",
  "CONTACT_FORM",
  "CONTACT_INFO",
  "GRID_ROW",
] as const satisfies readonly PageSectionType[];

export type PageSectionTypeValue = (typeof PAGE_SECTION_TYPES)[number];

export type PageSectionTypeMeta = {
  type: PageSectionTypeValue;
  label: string;
  description: string;
  defaultLabel: string;
};

export const PAGE_SECTION_TYPE_META: PageSectionTypeMeta[] = [
  {
    type: "HERO",
    label: "Hero",
    description: "Seçtiğiniz hero alanını slaytlarıyla gösterir.",
    defaultLabel: "Hero bölümü",
  },
  {
    type: "TRUSTED_CLIENTS",
    label: "Güvenilen müşteriler",
    description: "Aktif proje müşterilerinin logolarını listeler.",
    defaultLabel: "Müşteriler",
  },
  {
    type: "CARDS",
    label: "Kartlar",
    description: "Seçtiğiniz klasik kartları ızgara olarak gösterir.",
    defaultLabel: "Kartlar",
  },
  {
    type: "ADVANCED_CARD",
    label: "Gelişmiş kart",
    description: "Tek bir gelişmiş kartı (Neden biz vb.) gösterir.",
    defaultLabel: "Gelişmiş kart",
  },
  {
    type: "PROJECTS",
    label: "Projeler",
    description: "Kategoriye göre veya seçerek proje listeler.",
    defaultLabel: "Projeler",
  },
  {
    type: "WORKS",
    label: "Yapılan işler",
    description: "Kategoriye göre veya seçerek yapılan işleri listeler.",
    defaultLabel: "Yapılan işler",
  },
  {
    type: "BLOG",
    label: "Blog yazıları",
    description: "Kategoriye göre veya seçerek blog yazılarını gösterir.",
    defaultLabel: "Blog",
  },
  {
    type: "FAQ",
    label: "SSS",
    description: "Seçtiğiniz SSS grubunu accordion olarak gösterir.",
    defaultLabel: "SSS",
  },
  {
    type: "RICH_TEXT",
    label: "Metin / içerik",
    description: "Serbest zengin metin bloğu.",
    defaultLabel: "İçerik",
  },
  {
    type: "PRICING",
    label: "Fiyatlandırma",
    description: "Hazır fiyatlandırma bölümünü gösterir.",
    defaultLabel: "Fiyatlandırma",
  },
  {
    type: "CTA",
    label: "CTA",
    description: "Çağrı / iletişim bandı.",
    defaultLabel: "CTA",
  },
  {
    type: "CONTACT_FORM",
    label: "İletişim formu",
    description: "Özelleştirilebilir alanlarla gelişmiş iletişim formu.",
    defaultLabel: "İletişim formu",
  },
  {
    type: "CONTACT_INFO",
    label: "İletişim bilgileri",
    description:
      "E-posta, telefon, adres ve harita kartı (Genel Ayarlar’daki iletişim bilgileri).",
    defaultLabel: "İletişim bilgileri",
  },
  {
    type: "GRID_ROW",
    label: "Grid satırı",
    description:
      "Bootstrap tarzı 12’li responsive grid. Kolonlara istediğiniz bölümleri yerleştirin.",
    defaultLabel: "Grid satırı",
  },
];

export function getPageSectionTypeMeta(type: PageSectionTypeValue) {
  const found = PAGE_SECTION_TYPE_META.find((item) => item.type === type);
  if (!found) {
    throw new Error(`Unknown page section type: ${type}`);
  }
  return found;
}

export const CARD_COLUMNS_OPTIONS = [
  { value: 3, label: "3’lü (yan yana 3)" },
  { value: 4, label: "4’lü (yan yana 4)" },
  { value: 5, label: "5’li (yan yana 5)" },
] as const;

export type CardColumnsPerRow = (typeof CARD_COLUMNS_OPTIONS)[number]["value"];

export const CARD_SLIDER_EFFECTS = [
  { value: "slide", label: "Kaydırma (slide)" },
  { value: "fade", label: "Fade" },
  { value: "coverflow", label: "Coverflow" },
  { value: "cards", label: "Kart destesi" },
] as const;

export type CardSliderEffect = (typeof CARD_SLIDER_EFFECTS)[number]["value"];

export type PageSectionSettings = {
  limit?: number;
  showFeatures?: boolean;
  anchorId?: string;
  /** Başlık üstündeki küçük rozet / etiket (örn. Hizmetlerimiz) */
  eyebrow?: string;
  /** Projeler bölümü — sol büyük istatistik (örn. 50k+) */
  statValue?: string;
  /** Projeler bölümü — istatistik altı açıklama */
  statDescription?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Fiyatlandırma bölümü — alt birincil CTA */
  pricingPrimaryCtaLabel?: string;
  pricingPrimaryCtaUrl?: string;
  /** Fiyatlandırma bölümü — alt ikincil CTA */
  pricingSecondaryCtaLabel?: string;
  pricingSecondaryCtaUrl?: string;
  /** Kartlar bölümü — birincil buton (Keşfet) */
  showPrimaryCta?: boolean;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
  /** Kartlar bölümü — ikincil buton (Bize Ulaşın) */
  showSecondaryCta?: boolean;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  /** Kartlar bölümü — Swiper slider */
  enableSlider?: boolean;
  sliderAutoplay?: boolean;
  sliderEffect?: CardSliderEffect;
  /** Kartlar bölümü — yan yana kart sayısı */
  cardsPerRow?: CardColumnsPerRow;
  /** İletişim formu yapılandırması */
  contactForm?: ContactFormConfig;
  /** İletişim bilgileri kartı */
  contactInfoBlock?: ContactInfoBlockConfig;
  /** Grid satırı (GRID_ROW) */
  gridRow?: GridRowConfig;
  /** Grid kolonuna yerleştirme (çocuk bölüm) */
  gridCol?: GridColPlacement;
};

export const SECTIONS_WITH_EYEBROW = [
  "CARDS",
  "PROJECTS",
  "WORKS",
  "BLOG",
  "CONTACT_FORM",
  "CONTACT_INFO",
  "GRID_ROW",
] as const satisfies readonly PageSectionTypeValue[];

export function sectionSupportsEyebrow(type: PageSectionTypeValue): boolean {
  return (SECTIONS_WITH_EYEBROW as readonly string[]).includes(type);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function parseString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
}

function isCardSliderEffect(value: string): value is CardSliderEffect {
  return CARD_SLIDER_EFFECTS.some((item) => item.value === value);
}

function isCardColumnsPerRow(value: number): value is CardColumnsPerRow {
  return CARD_COLUMNS_OPTIONS.some((item) => item.value === value);
}

export function parseSectionSettings(raw: string | null | undefined): PageSectionSettings {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const obj = parsed as Record<string, unknown>;
    const settings: PageSectionSettings = {};
    if (typeof obj.limit === "number" && Number.isFinite(obj.limit)) {
      settings.limit = Math.max(1, Math.min(48, Math.round(obj.limit)));
    }
    const showFeatures = parseBoolean(obj.showFeatures);
    if (showFeatures !== undefined) settings.showFeatures = showFeatures;
    const anchorId = parseString(obj.anchorId, 80);
    if (anchorId) settings.anchorId = anchorId;
    const eyebrow = parseString(obj.eyebrow, 120);
    if (eyebrow) settings.eyebrow = eyebrow;
    const statValue = parseString(obj.statValue, 40);
    if (statValue) settings.statValue = statValue;
    const statDescription = parseString(obj.statDescription, 500);
    if (statDescription) settings.statDescription = statDescription;
    const ctaLabel = parseString(obj.ctaLabel, 100);
    if (ctaLabel) settings.ctaLabel = ctaLabel;
    const ctaUrl = parseString(obj.ctaUrl, 500);
    if (ctaUrl) settings.ctaUrl = ctaUrl;
    const pricingPrimaryCtaLabel = parseString(obj.pricingPrimaryCtaLabel, 100);
    if (pricingPrimaryCtaLabel) {
      settings.pricingPrimaryCtaLabel = pricingPrimaryCtaLabel;
    }
    const pricingPrimaryCtaUrl = parseString(obj.pricingPrimaryCtaUrl, 500);
    if (pricingPrimaryCtaUrl) {
      settings.pricingPrimaryCtaUrl = pricingPrimaryCtaUrl;
    }
    const pricingSecondaryCtaLabel = parseString(
      obj.pricingSecondaryCtaLabel,
      100,
    );
    if (pricingSecondaryCtaLabel) {
      settings.pricingSecondaryCtaLabel = pricingSecondaryCtaLabel;
    }
    const pricingSecondaryCtaUrl = parseString(obj.pricingSecondaryCtaUrl, 500);
    if (pricingSecondaryCtaUrl) {
      settings.pricingSecondaryCtaUrl = pricingSecondaryCtaUrl;
    }

    const showPrimaryCta = parseBoolean(obj.showPrimaryCta);
    if (showPrimaryCta !== undefined) settings.showPrimaryCta = showPrimaryCta;
    const primaryCtaLabel = parseString(obj.primaryCtaLabel, 100);
    if (primaryCtaLabel) settings.primaryCtaLabel = primaryCtaLabel;
    const primaryCtaUrl = parseString(obj.primaryCtaUrl, 500);
    if (primaryCtaUrl) settings.primaryCtaUrl = primaryCtaUrl;

    const showSecondaryCta = parseBoolean(obj.showSecondaryCta);
    if (showSecondaryCta !== undefined) settings.showSecondaryCta = showSecondaryCta;
    const secondaryCtaLabel = parseString(obj.secondaryCtaLabel, 100);
    if (secondaryCtaLabel) settings.secondaryCtaLabel = secondaryCtaLabel;
    const secondaryCtaUrl = parseString(obj.secondaryCtaUrl, 500);
    if (secondaryCtaUrl) settings.secondaryCtaUrl = secondaryCtaUrl;

    const enableSlider = parseBoolean(obj.enableSlider);
    if (enableSlider !== undefined) settings.enableSlider = enableSlider;
    const sliderAutoplay = parseBoolean(obj.sliderAutoplay);
    if (sliderAutoplay !== undefined) settings.sliderAutoplay = sliderAutoplay;
    if (typeof obj.sliderEffect === "string" && isCardSliderEffect(obj.sliderEffect)) {
      settings.sliderEffect = obj.sliderEffect;
    }
    if (typeof obj.cardsPerRow === "number" && isCardColumnsPerRow(obj.cardsPerRow)) {
      settings.cardsPerRow = obj.cardsPerRow;
    }
    const contactForm = parseContactFormConfig(obj.contactForm);
    if (contactForm) settings.contactForm = contactForm;
    const contactInfoBlock = parseContactInfoBlockConfig(obj.contactInfoBlock);
    if (contactInfoBlock) settings.contactInfoBlock = contactInfoBlock;
    const gridRow = parseGridRowConfig(obj.gridRow);
    if (gridRow) settings.gridRow = gridRow;
    const gridCol = parseGridColPlacement(obj.gridCol);
    if (gridCol) settings.gridCol = gridCol;
    return settings;
  } catch {
    return {};
  }
}

export function stringifySectionSettings(settings: PageSectionSettings): string | null {
  const cleaned: PageSectionSettings = {};
  if (typeof settings.limit === "number" && Number.isFinite(settings.limit)) {
    cleaned.limit = Math.max(1, Math.min(48, Math.round(settings.limit)));
  }
  if (typeof settings.showFeatures === "boolean") {
    cleaned.showFeatures = settings.showFeatures;
  }
  if (settings.anchorId?.trim()) cleaned.anchorId = settings.anchorId.trim().slice(0, 80);
  if (settings.eyebrow?.trim()) cleaned.eyebrow = settings.eyebrow.trim().slice(0, 120);
  if (settings.statValue?.trim()) cleaned.statValue = settings.statValue.trim().slice(0, 40);
  if (settings.statDescription?.trim()) {
    cleaned.statDescription = settings.statDescription.trim().slice(0, 500);
  }
  if (settings.ctaLabel?.trim()) cleaned.ctaLabel = settings.ctaLabel.trim().slice(0, 100);
  if (settings.ctaUrl?.trim()) cleaned.ctaUrl = settings.ctaUrl.trim().slice(0, 500);
  if (settings.pricingPrimaryCtaLabel?.trim()) {
    cleaned.pricingPrimaryCtaLabel = settings.pricingPrimaryCtaLabel
      .trim()
      .slice(0, 100);
  }
  if (settings.pricingPrimaryCtaUrl?.trim()) {
    cleaned.pricingPrimaryCtaUrl = settings.pricingPrimaryCtaUrl
      .trim()
      .slice(0, 500);
  }
  if (settings.pricingSecondaryCtaLabel?.trim()) {
    cleaned.pricingSecondaryCtaLabel = settings.pricingSecondaryCtaLabel
      .trim()
      .slice(0, 100);
  }
  if (settings.pricingSecondaryCtaUrl?.trim()) {
    cleaned.pricingSecondaryCtaUrl = settings.pricingSecondaryCtaUrl
      .trim()
      .slice(0, 500);
  }

  if (typeof settings.showPrimaryCta === "boolean") {
    cleaned.showPrimaryCta = settings.showPrimaryCta;
  }
  if (settings.primaryCtaLabel?.trim()) {
    cleaned.primaryCtaLabel = settings.primaryCtaLabel.trim().slice(0, 100);
  }
  if (settings.primaryCtaUrl?.trim()) {
    cleaned.primaryCtaUrl = settings.primaryCtaUrl.trim().slice(0, 500);
  }
  if (typeof settings.showSecondaryCta === "boolean") {
    cleaned.showSecondaryCta = settings.showSecondaryCta;
  }
  if (settings.secondaryCtaLabel?.trim()) {
    cleaned.secondaryCtaLabel = settings.secondaryCtaLabel.trim().slice(0, 100);
  }
  if (settings.secondaryCtaUrl?.trim()) {
    cleaned.secondaryCtaUrl = settings.secondaryCtaUrl.trim().slice(0, 500);
  }
  if (typeof settings.enableSlider === "boolean") {
    cleaned.enableSlider = settings.enableSlider;
  }
  if (typeof settings.sliderAutoplay === "boolean") {
    cleaned.sliderAutoplay = settings.sliderAutoplay;
  }
  if (settings.sliderEffect && isCardSliderEffect(settings.sliderEffect)) {
    cleaned.sliderEffect = settings.sliderEffect;
  }
  if (
    typeof settings.cardsPerRow === "number" &&
    isCardColumnsPerRow(settings.cardsPerRow)
  ) {
    cleaned.cardsPerRow = settings.cardsPerRow;
  }
  if (settings.contactForm) {
    const contactForm = parseContactFormConfig(settings.contactForm);
    if (contactForm) cleaned.contactForm = contactForm;
  }
  if (settings.contactInfoBlock) {
    const contactInfoBlock = parseContactInfoBlockConfig(settings.contactInfoBlock);
    if (contactInfoBlock) cleaned.contactInfoBlock = contactInfoBlock;
  }
  if (settings.gridRow) {
    const gridRow = parseGridRowConfig(settings.gridRow);
    if (gridRow) cleaned.gridRow = gridRow;
  }
  if (settings.gridCol) {
    const gridCol = parseGridColPlacement(settings.gridCol);
    if (gridCol) cleaned.gridCol = gridCol;
  }

  if (Object.keys(cleaned).length === 0) return null;
  return JSON.stringify(cleaned);
}

export function defaultLimitForType(type: PageSectionTypeValue): number {
  switch (type) {
    case "HERO":
    case "TRUSTED_CLIENTS":
    case "ADVANCED_CARD":
    case "FAQ":
    case "RICH_TEXT":
    case "PRICING":
    case "CTA":
    case "CONTACT_FORM":
    case "CONTACT_INFO":
    case "GRID_ROW":
      return 1;
    case "CARDS":
      return 6;
    case "PROJECTS":
      return 12;
    case "WORKS":
      return 18;
    case "BLOG":
      return 3;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function getContactFormSettings(
  settings: PageSectionSettings | null | undefined,
): ContactFormConfig {
  return settings?.contactForm ?? getDefaultContactFormConfig();
}

export function getContactInfoBlockSettings(
  settings: PageSectionSettings | null | undefined,
): ContactInfoBlockConfig {
  return settings?.contactInfoBlock ?? getDefaultContactInfoBlockConfig();
}

export function getGridRowSettings(
  settings: PageSectionSettings | null | undefined,
): GridRowConfig {
  return settings?.gridRow ?? getDefaultGridRowConfig();
}

/** Grid içine konulamayan / kendisi konteyner olan tipler */
export function isNestablePageSectionType(type: PageSectionTypeValue): boolean {
  return type !== "GRID_ROW" && type !== "HERO";
}

export function isPageSectionType(value: string): value is PageSectionTypeValue {
  return (PAGE_SECTION_TYPES as readonly string[]).includes(value);
}
