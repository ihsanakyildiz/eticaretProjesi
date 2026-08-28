import { prisma } from "@/lib/prisma";

export const HERO_LAYOUTS = [
  { value: "SPLIT_COLLAGE", label: "Split + kolaj" },
  { value: "FULL_BLEED", label: "Tam genişlik" },
  { value: "CENTERED", label: "Ortalı" },
] as const;

export type HeroLayoutValue = (typeof HERO_LAYOUTS)[number]["value"];

export const HERO_BACKGROUND_STYLES = [
  { value: "grid", label: "Izgara" },
  { value: "plain", label: "Düz" },
  { value: "soft-gradient", label: "Yumuşak gradient" },
] as const;

export type HeroBackgroundStyle = (typeof HERO_BACKGROUND_STYLES)[number]["value"];

export const HERO_MEDIA_LIMITS = {
  LOGO: 8,
  COLLAGE: 6,
  AVATAR: 6,
} as const;

export type HeroMediaKindValue = keyof typeof HERO_MEDIA_LIMITS;

export const DEFAULT_HERO_SLIDE = {
  badgeText: "Ömür Boyu Güncelleme",
  badgeIcon: "rocket",
  kicker: "İhsan Akyıldız",
  headline: "Markanızı birlikte yükseltelim.",
  headlineAccent: "yükseltelim.",
  subheadline:
    "Web tasarım, yazılım ve dijital çözümlerle işinizi büyütün.",
  ctaLabel: "Başlayın",
  ctaUrl: "/iletisim",
  ctaSecondaryLabel: "Projeleri İncele",
  ctaSecondaryUrl: "/projeler",
  trustLabel: "Güvenen markalar",
  overlayPercent: 0,
  titleColor: "#0f172a",
  accentColor: "#7c3aed",
  subtitleColor: "#64748b",
  ctaBgColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  titleFont: "",
  layout: "SPLIT_COLLAGE" as HeroLayoutValue,
  backgroundStyle: "grid" as HeroBackgroundStyle,
  themeColor: "#7c3aed",
  showStars: true,
  starCount: 5,
  showAvatars: true,
};

export type HeroSlideMediaRow = {
  kind: string;
  image: string;
  alt?: string | null;
  label?: string | null;
  href?: string | null;
};

export type HeroSlideRow = {
  kicker?: string | null;
  badgeText?: string | null;
  headline?: string | null;
  headlineAccent?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryUrl?: string | null;
  trustLabel?: string | null;
  showStars?: boolean | null;
  starCount?: number | null;
  showAvatars?: boolean | null;
  layout?: string | null;
  backgroundStyle?: string | null;
  media?: HeroSlideMediaRow[];
};

export type MappedHeroSlideProps = {
  kicker?: string | null;
  badgeText?: string | null;
  headline: string;
  headlineAccent?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryUrl?: string | null;
  trustLabel?: string | null;
  showStars?: boolean;
  starCount?: number;
  showAvatars?: boolean;
  layout?: HeroLayoutValue | string | null;
  collageImages?: Array<{ src: string; alt: string }>;
  logos?: Array<{ src: string; alt: string; label: string; href?: string | null }>;
  avatars?: Array<{ src: string; alt: string }>;
  backgroundStyle?: string | null;
  priority?: boolean;
};

export function getHeroLcpImageUrl(
  slides: MappedHeroSlideProps[],
): string | null {
  const firstImage = slides[0]?.collageImages?.[0]?.src;
  return firstImage?.trim() ? firstImage : null;
}

export function mapHeroSlideToProps(
  slide: HeroSlideRow,
  siteName: string,
  options?: { priority?: boolean },
): MappedHeroSlideProps {
  const collage =
    slide.media
      ?.filter((item) => item.kind === "COLLAGE")
      .map((item) => ({
        src: item.image,
        alt: item.alt || item.label || siteName,
      })) ?? [];
  const logos =
    slide.media
      ?.filter((item) => item.kind === "LOGO")
      .map((item) => ({
        src: item.image,
        alt: item.alt || item.label || "Logo",
        label: item.label || "Logo",
        href: item.href,
      })) ?? [];
  const avatars =
    slide.media
      ?.filter((item) => item.kind === "AVATAR")
      .map((item) => ({ src: item.image, alt: item.alt || "" })) ?? [];

  return {
    kicker: slide.kicker,
    badgeText: slide.badgeText,
    headline: slide.headline ?? DEFAULT_HERO_SLIDE.headline,
    headlineAccent: slide.headlineAccent ?? DEFAULT_HERO_SLIDE.headlineAccent,
    subheadline: slide.subheadline ?? DEFAULT_HERO_SLIDE.subheadline,
    ctaLabel: slide.ctaLabel ?? DEFAULT_HERO_SLIDE.ctaLabel,
    ctaUrl: slide.ctaUrl ?? DEFAULT_HERO_SLIDE.ctaUrl,
    ctaSecondaryLabel: slide.ctaSecondaryLabel ?? DEFAULT_HERO_SLIDE.ctaSecondaryLabel,
    ctaSecondaryUrl: slide.ctaSecondaryUrl ?? DEFAULT_HERO_SLIDE.ctaSecondaryUrl,
    trustLabel: slide.trustLabel ?? DEFAULT_HERO_SLIDE.trustLabel,
    showStars: slide.showStars ?? DEFAULT_HERO_SLIDE.showStars,
    starCount: slide.starCount ?? DEFAULT_HERO_SLIDE.starCount,
    showAvatars: slide.showAvatars ?? DEFAULT_HERO_SLIDE.showAvatars,
    layout: slide.layout ?? DEFAULT_HERO_SLIDE.layout,
    collageImages: collage,
    logos,
    avatars,
    backgroundStyle: slide.backgroundStyle ?? DEFAULT_HERO_SLIDE.backgroundStyle,
    priority: options?.priority ?? false,
  };
}

export type HeroSliderSettings = {
  autoplay?: boolean;
  intervalMs?: number;
  showDots?: boolean;
  showArrows?: boolean;
};

export async function getHeroBySlug(slug: string) {
  return prisma.hero.findFirst({
    where: { slug, isActive: true },
    include: {
      slides: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          media: {
            orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
          },
        },
      },
    },
  });
}
