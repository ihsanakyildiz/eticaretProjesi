"use client";

import { ArrowUpRight, Rocket, Star } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import type { HeroLayoutValue } from "@/lib/heroes";

export type HomeHeroProps = {
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

function resolveLayout(value?: string | null): HeroLayoutValue {
  if (value === "FULL_BLEED" || value === "CENTERED" || value === "SPLIT_COLLAGE") {
    return value;
  }
  return "SPLIT_COLLAGE";
}

export function HomeHero({
  kicker,
  badgeText,
  headline,
  headlineAccent,
  subheadline,
  ctaLabel,
  ctaUrl,
  ctaSecondaryLabel,
  ctaSecondaryUrl,
  trustLabel,
  showStars = true,
  starCount = 5,
  showAvatars = true,
  layout: layoutProp,
  collageImages = [],
  logos = [],
  avatars = [],
  backgroundStyle = "grid",
  priority = false,
}: HomeHeroProps) {
  const layout = resolveLayout(layoutProp);
  const isCentered = layout === "CENTERED";
  const isFullBleed = layout === "FULL_BLEED";
  const isSplit = layout === "SPLIT_COLLAGE";

  const accent = headlineAccent?.trim();
  const titleParts =
    accent && headline.includes(accent)
      ? {
          before: headline.slice(0, headline.indexOf(accent)),
          accent,
          after: headline.slice(headline.indexOf(accent) + accent.length),
        }
      : { before: headline, accent: "", after: "" };

  const images = collageImages;
  const avatarSrcs = avatars.map((item) => item.src);
  const showAvatarRow = showAvatars && avatarSrcs.length > 0;
  const showCollage = images.length > 0;

  const textBlock = (
    <div className={`site-animate-fade-up ${isCentered ? "mx-auto max-w-2xl" : ""}`}>
      {badgeText ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-site-primary/20 bg-site-primary-soft px-3 py-1.5 text-xs font-semibold tracking-wide text-site-primary uppercase">
          <Rocket className="h-3.5 w-3.5" />
          {badgeText}
        </span>
      ) : null}

      {kicker ? (
        <p className="mt-5 text-lg font-semibold text-site-primary/90 sm:text-xl">
          {kicker}
        </p>
      ) : null}

      <h1 className={`${kicker ? "mt-2" : "mt-5"} font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-site-fg sm:text-5xl lg:text-[3.4rem]`}>
        {titleParts.before}
        {titleParts.accent ? (
          <span className="text-site-primary">{titleParts.accent}</span>
        ) : null}
        {titleParts.after}
      </h1>

      {subheadline ? (
        <p
          className={`mt-5 text-base leading-relaxed text-site-muted sm:text-lg ${
            isCentered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {subheadline}
        </p>
      ) : null}

      <div
        className={`mt-8 flex flex-wrap items-center gap-3 ${
          isCentered ? "justify-center" : ""
        }`}
      >
        {ctaLabel ? (
          <SiteLink
            href={ctaUrl || "/iletisim"}
            className="inline-flex items-center gap-2 rounded-full bg-site-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 hover:brightness-110"
          >
            {ctaLabel}
            <ArrowUpRight className="h-4 w-4" />
          </SiteLink>
        ) : null}
        {ctaSecondaryLabel ? (
          <SiteLink
            href={ctaSecondaryUrl || "/projeler"}
            className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-card px-6 py-3.5 text-sm font-semibold text-site-fg transition hover:border-site-primary hover:text-site-primary"
          >
            {ctaSecondaryLabel}
          </SiteLink>
        ) : null}
      </div>

      {(showStars || showAvatarRow) && (isCentered || isFullBleed) ? (
        <div
          className={`mt-8 flex flex-wrap items-center gap-4 ${
            isCentered ? "justify-center" : ""
          }`}
        >
          {showStars ? (
            <div className="flex gap-1 text-amber-400">
              {Array.from({ length: Math.min(Math.max(starCount, 1), 5) }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
          ) : null}
          {showAvatarRow ? (
            <div className="flex -space-x-2">
              {avatarSrcs.slice(0, 6).map((src) => (
                <span
                  key={src}
                  className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white site-dark:border-slate-800"
                >
                  <SiteImage src={src} alt="" fill className="object-cover" sizes="36px" />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {trustLabel || logos.length > 0 ? (
      <div className="mt-10">
        {trustLabel ? (
        <p className="text-xs font-medium tracking-wide text-site-muted uppercase">
          {trustLabel}
        </p>
        ) : null}
        {logos.length > 0 ? (
          <div
            className={`mt-4 flex flex-wrap items-center gap-6 ${
              isCentered ? "justify-center" : ""
            }`}
          >
            {logos.slice(0, 8).map((logo, index) => {
              const image = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.src}
                  alt={logo.alt || logo.label || "Logo"}
                  className="h-10 w-auto max-w-[140px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              );

              if (logo.href) {
                return (
                  <SiteLink
                    key={`${logo.src}-${index}`}
                    href={logo.href}
                    className="inline-flex"
                  >
                    {image}
                  </SiteLink>
                );
              }

              return (
                <span key={`${logo.src}-${index}`} className="inline-flex">
                  {image}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );

  const collageBlock = showCollage ? (
    <div className="relative site-animate-fade-up" style={{ animationDelay: "120ms" }}>
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-fuchsia-400/10 to-emerald-300/20 blur-2xl" />
      <div className="relative grid grid-cols-2 gap-4">
        {images[0] ? (
          <div
            className={`site-animate-float relative overflow-hidden rounded-[1.6rem] shadow-xl ${
              images.length === 1 ? "col-span-2 aspect-[16/10]" : "col-span-2 aspect-[16/10]"
            }`}
          >
            <SiteImage
              src={images[0].src}
              alt={images[0].alt || "Hero"}
              fill
              priority={priority}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          </div>
        ) : null}
        {images[1] ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] shadow-lg">
            <SiteImage
              src={images[1].src}
              alt={images[1].alt || "Hero"}
              fill
              className="object-cover"
              sizes="260px"
            />
          </div>
        ) : null}
        {images[2] ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] shadow-lg">
            <SiteImage
              src={images[2].src}
              alt={images[2].alt || "Hero"}
              fill
              className="object-cover"
              sizes="260px"
            />
          </div>
        ) : null}
      </div>

      {showStars ? (
        <div className="absolute top-6 -right-1 flex rotate-12 gap-1 text-amber-400 sm:right-4">
          {Array.from({ length: Math.min(Math.max(starCount, 1), 5) }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
      ) : null}

      {showAvatarRow ? (
        <div className="absolute -bottom-3 left-6 flex -space-x-2 rounded-full border border-white/70 bg-white/90 p-1.5 shadow-lg backdrop-blur site-dark:border-slate-700 site-dark:bg-slate-900/90">
          {avatarSrcs.slice(0, 6).map((src) => (
            <span
              key={src}
              className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white site-dark:border-slate-800"
            >
              <SiteImage src={src} alt="" fill className="object-cover" sizes="36px" />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <section
      className={`relative overflow-hidden ${
        backgroundStyle === "soft-gradient" ? "site-soft-glow" : ""
      } ${backgroundStyle === "grid" ? "site-grid-bg" : ""}`}
    >
      {isFullBleed && images[0] ? (
        <div className="absolute inset-0">
          <SiteImage
            src={images[0].src}
            alt=""
            fill
            priority={priority}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-80" />
      <div
        className={`relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24 ${
          isSplit && showCollage
            ? "grid items-center gap-12 lg:grid-cols-2 lg:gap-10"
            : isCentered
              ? "flex flex-col items-center text-center"
              : "max-w-4xl text-white"
        }`}
      >
        {isFullBleed ? (
          <div className="relative z-10 [&_h1]:text-white [&_.text-site-fg]:text-white [&_.text-site-muted]:text-white/80 [&_.text-site-primary\/90]:text-white">
            {textBlock}
          </div>
        ) : (
          textBlock
        )}
        {isSplit ? collageBlock : null}
        {isCentered && collageBlock ? (
          <div className="mt-12 w-full max-w-3xl">{collageBlock}</div>
        ) : null}
      </div>
    </section>
  );
}
