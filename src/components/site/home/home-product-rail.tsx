"use client";

import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Autoplay, EffectCards, EffectCoverflow, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import type { SwiperOptions } from "swiper/types";
import { ProductCard } from "@/components/site/catalog/product-card";
import { RecentlyViewedRail } from "@/components/site/catalog/recently-viewed-rail";
import type { CatalogProductCard } from "@/lib/catalog-storefront";
import type {
  CardColumnsPerRow,
  CardSliderEffect,
  ProductSectionSource,
} from "@/lib/page-sections";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/effect-coverflow";
import "swiper/css/effect-cards";

function resolveColumns(cardsPerRow: CardColumnsPerRow): CardColumnsPerRow {
  switch (cardsPerRow) {
    case 3:
    case 4:
    case 5:
    case 8:
      return cardsPerRow;
    default: {
      const _exhaustive: never = cardsPerRow;
      return _exhaustive;
    }
  }
}

function productTrackClass(columns: CardColumnsPerRow) {
  switch (columns) {
    case 8:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";
    case 5:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    case 4:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
    case 3:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3";
    default: {
      const _exhaustive: never = columns;
      return _exhaustive;
    }
  }
}

function productGridClass(columns: CardColumnsPerRow) {
  return `mt-6 ${productTrackClass(columns)}`;
}

function chunkProducts<T>(items: T[], size: number) {
  const pages: T[][] = [];
  const step = Math.max(1, size);
  for (let i = 0; i < items.length; i += step) {
    pages.push(items.slice(i, i + step));
  }
  return pages;
}

function productShellClass(columns: CardColumnsPerRow) {
  switch (columns) {
    case 8:
    case 5:
      return "mx-auto w-full max-w-[112rem] px-4 sm:px-6 lg:px-8";
    case 4:
    case 3:
      return "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";
    default: {
      const _exhaustive: never = columns;
      return _exhaustive;
    }
  }
}

function productSliderBreakpoints(
  columns: CardColumnsPerRow,
  effect: CardSliderEffect,
): SwiperOptions["breakpoints"] {
  if (effect === "cards" || effect === "fade") return undefined;
  switch (columns) {
    case 8:
      return {
        480: { slidesPerView: 3, spaceBetween: 12 },
        768: { slidesPerView: 4, spaceBetween: 12 },
        1024: { slidesPerView: 6, spaceBetween: 14 },
        1280: { slidesPerView: 8, spaceBetween: 14 },
      };
    case 5:
      return {
        640: { slidesPerView: 3, spaceBetween: 14 },
        1024: { slidesPerView: 4, spaceBetween: 16 },
        1280: { slidesPerView: 5, spaceBetween: 16 },
      };
    case 4:
      return {
        640: { slidesPerView: 3, spaceBetween: 14 },
        1024: { slidesPerView: 4, spaceBetween: 16 },
      };
    case 3:
      return {
        640: { slidesPerView: 2, spaceBetween: 14 },
        1024: { slidesPerView: 3, spaceBetween: 16 },
      };
    default: {
      const _exhaustive: never = columns;
      return _exhaustive;
    }
  }
}

function productMobileSlides(columns: CardColumnsPerRow, effect: CardSliderEffect) {
  if (effect === "cards" || effect === "fade") return 1;
  switch (columns) {
    case 8:
    case 5:
    case 4:
      return 2;
    case 3:
      return 1.15;
    default: {
      const _exhaustive: never = columns;
      return _exhaustive;
    }
  }
}

export function HomeProductRail({
  title,
  subtitle,
  eyebrow,
  products,
  source,
  enableSlider = false,
  sliderAutoplay = true,
  sliderEffect = "slide",
  sliderLoop = true,
  sliderNavigation = true,
  sliderPagination = true,
  sliderDelay = 3500,
  sliderSpeed = 700,
  cardsPerRow = 4,
}: {
  title: string | null;
  subtitle: string | null;
  eyebrow?: string;
  products: CatalogProductCard[];
  source: ProductSectionSource;
  enableSlider?: boolean;
  sliderAutoplay?: boolean;
  sliderEffect?: CardSliderEffect;
  sliderLoop?: boolean;
  sliderNavigation?: boolean;
  sliderPagination?: boolean;
  sliderDelay?: number;
  sliderSpeed?: number;
  cardsPerRow?: CardColumnsPerRow;
}) {
  const columns = resolveColumns(cardsPerRow);
  const effect: CardSliderEffect = sliderEffect || "slide";
  const uid = useId().replace(/:/g, "");
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  if (source === "RECENTLY_VIEWED") {
    return (
      <RecentlyViewedRail title={title} subtitle={subtitle} eyebrow={eyebrow} />
    );
  }

  if (products.length === 0) return null;

  const heading = title?.trim() || null;
  const kicker = eyebrow?.trim() || null;
  const lead = subtitle?.trim() || null;
  const fadePages = effect === "fade" ? chunkProducts(products, columns) : null;
  const canLoop = fadePages
    ? sliderLoop && fadePages.length > 1
    : sliderLoop && products.length > Math.ceil(columns);
  const modules = [
    ...(sliderNavigation ? [Navigation] : []),
    ...(sliderPagination ? [Pagination] : []),
    ...(sliderAutoplay ? [Autoplay] : []),
    ...(effect === "fade" ? [EffectFade] : []),
    ...(effect === "coverflow" ? [EffectCoverflow] : []),
    ...(effect === "cards" ? [EffectCards] : []),
  ];

  return (
    <section className="border-b border-site-border py-12 sm:py-14">
      <div className={productShellClass(columns)}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
                {kicker}
              </p>
            ) : null}
            {heading ? (
              <h2 className="mt-1 font-display text-2xl font-bold text-site-fg sm:text-3xl">
                {heading}
              </h2>
            ) : null}
            {lead ? (
              <p className="mt-2 max-w-2xl text-sm text-site-muted">{lead}</p>
            ) : null}
          </div>
          {enableSlider && sliderNavigation ? (
            <div className="flex gap-2">
              <button
                ref={prevRef}
                type="button"
                className={`product-swiper-prev-${uid} inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted transition hover:border-site-primary/40 hover:text-site-primary`}
                aria-label="Önceki ürünler"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                ref={nextRef}
                type="button"
                className={`product-swiper-next-${uid} inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted transition hover:border-site-primary/40 hover:text-site-primary`}
                aria-label="Sonraki ürünler"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {enableSlider ? (
          <div
            className="site-cards-swiper site-product-swiper mt-6"
            data-cols={columns}
            data-effect={effect}
          >
            <Swiper
              modules={modules}
              effect={effect === "slide" ? "slide" : effect}
              grabCursor
              loop={canLoop}
              speed={sliderSpeed}
              spaceBetween={effect === "fade" ? 0 : 12}
              slidesPerView={productMobileSlides(columns, effect)}
              watchOverflow
              observer
              observeParents
              autoHeight={effect === "fade"}
              centeredSlides={effect === "coverflow" || effect === "cards"}
              coverflowEffect={
                effect === "coverflow"
                  ? {
                      rotate: 12,
                      stretch: 0,
                      depth: 80,
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
                      delay: sliderDelay,
                      disableOnInteraction: false,
                      pauseOnMouseEnter: true,
                    }
                  : false
              }
              navigation={
                sliderNavigation
                  ? {
                      prevEl: `.product-swiper-prev-${uid}`,
                      nextEl: `.product-swiper-next-${uid}`,
                    }
                  : false
              }
              pagination={
                sliderPagination ? { clickable: true, dynamicBullets: columns >= 5 } : false
              }
              breakpoints={productSliderBreakpoints(columns, effect)}
              onBeforeInit={(swiper: SwiperType) => {
                if (!sliderNavigation) return;
                const nav = swiper.params.navigation;
                if (nav && typeof nav !== "boolean") {
                  nav.prevEl = prevRef.current;
                  nav.nextEl = nextRef.current;
                }
              }}
              className={sliderPagination ? "!pb-12" : undefined}
            >
              {fadePages
                ? fadePages.map((page, pageIndex) => (
                    <SwiperSlide key={page.map((item) => item.id).join("-")} className="!h-auto">
                      <div className={productTrackClass(columns)}>
                        {page.map((product, index) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            imagePriority={pageIndex === 0 && index < 4}
                          />
                        ))}
                      </div>
                    </SwiperSlide>
                  ))
                : products.map((product, index) => (
                    <SwiperSlide key={product.id} className="!h-auto">
                      <div
                        className={
                          effect === "cards"
                            ? "mx-auto h-full w-full max-w-[17rem] px-0.5 py-1"
                            : "h-full px-0.5 py-1"
                        }
                      >
                        <ProductCard product={product} imagePriority={index < 4} />
                      </div>
                    </SwiperSlide>
                  ))}
            </Swiper>
          </div>
        ) : (
          <div className={productGridClass(columns)}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                imagePriority={index < 4}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
