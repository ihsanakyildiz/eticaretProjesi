"use client";

import dynamic from "next/dynamic";
import { HomeHero } from "@/components/site/home/home-hero";
import type { MappedHeroSlideProps } from "@/lib/heroes";

const HomeHeroSliderCarousel = dynamic(
  () =>
    import("@/components/site/home/home-hero-slider-carousel").then(
      (mod) => mod.HomeHeroSliderCarousel,
    ),
  {
    ssr: true,
    loading: () => (
      <div
        className="min-h-[28rem] animate-pulse rounded-3xl bg-site-surface/60"
        aria-hidden
      />
    ),
  },
);

type HomeHeroSliderProps = {
  slides: MappedHeroSlideProps[];
  autoplay?: boolean;
  intervalMs?: number;
  showDots?: boolean;
  showArrows?: boolean;
};

export function HomeHeroSlider({
  slides,
  autoplay = true,
  intervalMs = 6000,
  showDots = true,
  showArrows = true,
}: HomeHeroSliderProps) {
  if (slides.length === 0) return null;
  if (slides.length === 1) {
    return <HomeHero {...slides[0]} />;
  }

  return (
    <HomeHeroSliderCarousel
      slides={slides}
      autoplay={autoplay}
      intervalMs={intervalMs}
      showDots={showDots}
      showArrows={showArrows}
    />
  );
}
