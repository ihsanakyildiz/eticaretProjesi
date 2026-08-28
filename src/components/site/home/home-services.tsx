"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutTemplate,
  LineChart,
  Phone,
  Rocket,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Autoplay, EffectCards, EffectCoverflow, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { LucideIconByName } from "@/lib/lucide-icons";
import type { CardColumnsPerRow, CardSliderEffect } from "@/lib/page-sections";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/effect-coverflow";
import "swiper/css/effect-cards";

export type ServiceCardItem = {
  title: string;
  description?: string;
  href: string;
  icon?: string | null;
  image?: string | null;
  mediaType?: "IMAGE" | "ICON" | string | null;
};

export type HomeServicesCta = {
  show?: boolean;
  label?: string | null;
  url?: string | null;
};

const FALLBACK_ICONS: LucideIcon[] = [
  ClipboardList,
  LineChart,
  LayoutTemplate,
  Rocket,
  Wallet,
  Sparkles,
];

const FALLBACK_SERVICES: ServiceCardItem[] = [
  {
    title: "Araştırma & Planlama",
    description: "İhtiyaç analizi ve yol haritası ile projenizi netleştiriyoruz.",
    href: "/hizmetler",
  },
  {
    title: "Strateji Laboratuvarı",
    description: "Marka ve ürün için ölçülebilir dijital stratejiler kuruyoruz.",
    href: "/hizmetler",
  },
  {
    title: "İş Danışmanlığı",
    description: "Süreçlerinizi sadeleştirip büyüme fırsatlarını ortaya çıkarıyoruz.",
    href: "/hizmetler",
  },
  {
    title: "Marka Tanıtımı",
    description: "Görünürlüğünüzü artıran kampanya ve içerik çalışmaları.",
    href: "/hizmetler",
  },
  {
    title: "Finansal Danışmanlık",
    description: "Bütçe ve yatırım kararlarında net, uygulanabilir öneriler.",
    href: "/hizmetler",
  },
  {
    title: "Gelir Artırma",
    description: "Dönüşüm odaklı deneyimler ve yeni gelir kanalları tasarlıyoruz.",
    href: "/hizmetler",
  },
];

function ServiceCard({
  card,
  index,
  compact = false,
}: {
  card: ServiceCardItem;
  index: number;
  compact?: boolean;
}) {
  const FallbackIcon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
  return (
    <article
      className={`group flex h-full min-w-0 flex-col rounded-3xl border border-site-border bg-site-card text-center shadow-sm transition hover:-translate-y-1 hover:border-site-primary/40 hover:shadow-xl hover:shadow-violet-500/10 ${
        compact ? "p-5 sm:p-6" : "p-7"
      }`}
    >
      <div
        className={`mx-auto overflow-hidden ${
          card.mediaType === "IMAGE" && card.image
            ? compact
              ? "relative h-28 w-full max-w-[11rem] rounded-2xl sm:h-32"
              : "relative h-32 w-full max-w-[13rem] rounded-2xl"
            : `flex items-center justify-center rounded-2xl bg-site-primary-soft text-site-primary ${
                compact ? "h-12 w-12" : "h-14 w-14"
              }`
        }`}
      >
        {card.mediaType === "IMAGE" && card.image ? (
          <SiteImage
            src={card.image}
            alt={card.title}
            fill
            className="object-cover"
            sizes="208px"
          />
        ) : card.icon ? (
          <LucideIconByName
            name={card.icon}
            className={compact ? "h-5 w-5" : "h-6 w-6"}
          />
        ) : (
          <FallbackIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        )}
      </div>
      <h3
        className={`mt-5 font-semibold text-site-fg ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        {card.title}
      </h3>
      {card.description ? (
        <div
          className="site-rich-content mt-2 flex-1 text-sm [&_p]:mb-2 [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm"
          dangerouslySetInnerHTML={{ __html: card.description }}
        />
      ) : (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-site-muted">
          Profesyonel ekibimizle ölçülebilir sonuçlar üreten çözümler sunuyoruz.
        </p>
      )}
      <SiteLink
        href={card.href}
        className="mt-5 inline-flex items-center justify-center gap-1 text-sm font-semibold text-site-primary transition group-hover:gap-2"
      >
        Daha fazla
        <ArrowUpRight className="h-4 w-4" />
      </SiteLink>
    </article>
  );
}

export function HomeServices({
  items,
  title,
  subtitle,
  eyebrow,
  primaryCta,
  secondaryCta,
  enableSlider = false,
  sliderAutoplay = true,
  sliderEffect = "slide",
  cardsPerRow = 3,
}: {
  items?: ServiceCardItem[];
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  primaryCta?: HomeServicesCta;
  secondaryCta?: HomeServicesCta;
  enableSlider?: boolean;
  sliderAutoplay?: boolean;
  sliderEffect?: CardSliderEffect;
  cardsPerRow?: CardColumnsPerRow;
}) {
  const fromCms = Boolean(items && items.length > 0);
  const cards = fromCms ? items! : FALLBACK_SERVICES;
  const heading = title?.trim() || "Hizmet özelliklerimizi keşfedin";
  const lead =
    subtitle?.trim() ||
    "Tasarım, yazılım ve dijital büyüme için uçtan uca çözümler.";
  const badge = eyebrow?.trim() || "••• Hizmetlerimiz";
  const columns: CardColumnsPerRow =
    cardsPerRow === 4 || cardsPerRow === 5 ? cardsPerRow : 3;

  const showPrimary = primaryCta?.show !== false;
  const showSecondary = secondaryCta?.show !== false;
  const primaryLabel = primaryCta?.label?.trim() || "Keşfet";
  const primaryUrl = primaryCta?.url?.trim() || "/hizmetler";
  const secondaryLabel = secondaryCta?.label?.trim() || "Bize Ulaşın";
  const secondaryUrl = secondaryCta?.url?.trim() || "/iletisim";

  const effect: CardSliderEffect = sliderEffect || "slide";
  const modules = [
    Navigation,
    Pagination,
    ...(sliderAutoplay ? [Autoplay] : []),
    ...(effect === "fade" ? [EffectFade] : []),
    ...(effect === "coverflow" ? [EffectCoverflow] : []),
    ...(effect === "cards" ? [EffectCards] : []),
  ];

  const gridClass =
    columns === 5
      ? "mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : columns === 4
        ? "mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
        : "mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3";

  const shellClass =
    columns === 5
      ? "relative mx-auto w-full max-w-[112rem] px-4 sm:px-6 lg:px-8 xl:px-10"
      : columns === 4
        ? "relative mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8"
        : "relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

  const sliderBreakpoints =
    effect === "cards" || effect === "fade"
      ? undefined
      : {
          640: { slidesPerView: Math.min(2, columns), spaceBetween: 16 },
          900: { slidesPerView: Math.min(3, columns), spaceBetween: 18 },
          1100: {
            slidesPerView:
              effect === "coverflow"
                ? Math.min(2.4, columns)
                : Math.min(4, columns),
            spaceBetween: 20,
          },
          1400: {
            slidesPerView:
              effect === "coverflow" ? Math.min(2.8, columns) : columns,
            spaceBetween: 20,
          },
        };

  const compactCards = columns >= 4;

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow" />
      <div className={shellClass}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            {badge}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 text-site-muted">{lead}</p>
        </div>

        {enableSlider ? (
          <div className="site-cards-swiper mt-12">
            <Swiper
              modules={modules}
              effect={effect === "slide" ? "slide" : effect}
              grabCursor
              loop={cards.length > columns}
              speed={700}
              spaceBetween={20}
              slidesPerView={1}
              centeredSlides={effect === "coverflow" || effect === "cards"}
              coverflowEffect={
                effect === "coverflow"
                  ? {
                      rotate: 18,
                      stretch: 0,
                      depth: 120,
                      modifier: 1,
                      slideShadows: false,
                    }
                  : undefined
              }
              cardsEffect={
                effect === "cards"
                  ? { perSlideOffset: 8, perSlideRotate: 2 }
                  : undefined
              }
              fadeEffect={effect === "fade" ? { crossFade: true } : undefined}
              autoplay={
                sliderAutoplay
                  ? {
                      delay: 3500,
                      disableOnInteraction: false,
                      pauseOnMouseEnter: true,
                    }
                  : false
              }
              navigation
              pagination={{ clickable: true }}
              breakpoints={sliderBreakpoints}
              className="!pb-12"
            >
              {cards.map((card, index) => (
                <SwiperSlide
                  key={`${card.title}-${card.href}-${index}`}
                  className="!h-auto"
                >
                  <div className="h-full px-1 py-2">
                    <ServiceCard
                      card={card}
                      index={index}
                      compact={compactCards}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div className={gridClass}>
            {cards.map((card, index) => (
              <ServiceCard
                key={`${card.title}-${card.href}-${index}`}
                card={card}
                index={index}
                compact={compactCards}
              />
            ))}
          </div>
        )}

        {showPrimary || showSecondary ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {showPrimary ? (
              <SiteLink
                href={primaryUrl}
                className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25"
              >
                {primaryLabel}
                <ArrowUpRight className="h-4 w-4" />
              </SiteLink>
            ) : null}
            {showSecondary ? (
              <SiteLink
                href={secondaryUrl}
                className="inline-flex items-center gap-2 rounded-full border border-site-primary/40 bg-site-card px-5 py-3 text-sm font-semibold text-site-fg"
              >
                <Phone className="h-4 w-4 text-site-primary" />
                {secondaryLabel}
              </SiteLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
