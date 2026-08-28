"use client";

import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { HomeHero } from "@/components/site/home/home-hero";
import type { MappedHeroSlideProps } from "@/lib/heroes";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

type HomeHeroSliderCarouselProps = {
  slides: MappedHeroSlideProps[];
  autoplay?: boolean;
  intervalMs?: number;
  showDots?: boolean;
  showArrows?: boolean;
};

export function HomeHeroSliderCarousel({
  slides,
  autoplay = true,
  intervalMs = 6000,
  showDots = true,
  showArrows = true,
}: HomeHeroSliderCarouselProps) {
  const uid = useId().replace(/:/g, "");
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const delay = Math.max(intervalMs, 2000);

  return (
    <div className="site-hero-swiper relative">
      {showArrows ? (
        <>
          <button
            ref={prevRef}
            type="button"
            className={`hero-swiper-prev-${uid} absolute top-1/2 left-3 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-site-fg shadow-lg backdrop-blur transition hover:border-site-primary/40 hover:text-site-primary sm:left-6`}
            aria-label="Önceki slayt"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            ref={nextRef}
            type="button"
            className={`hero-swiper-next-${uid} absolute top-1/2 right-3 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-site-fg shadow-lg backdrop-blur transition hover:border-site-primary/40 hover:text-site-primary sm:right-6`}
            aria-label="Sonraki slayt"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      <Swiper
        modules={[Autoplay, EffectFade, Navigation, Pagination]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={900}
        slidesPerView={1}
        autoplay={
          autoplay
            ? {
                delay,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        navigation={
          showArrows
            ? {
                prevEl: `.hero-swiper-prev-${uid}`,
                nextEl: `.hero-swiper-next-${uid}`,
              }
            : false
        }
        pagination={showDots ? { clickable: true } : false}
        onBeforeInit={(swiper: SwiperType) => {
          const nav = swiper.params.navigation;
          if (nav && typeof nav !== "boolean") {
            nav.prevEl = prevRef.current;
            nav.nextEl = nextRef.current;
          }
        }}
        className="!pb-0"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={`${slide.headline}-${index}`}>
            <HomeHero {...slide} priority={index === 0} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
