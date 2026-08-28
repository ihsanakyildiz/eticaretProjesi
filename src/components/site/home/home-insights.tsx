"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useId, useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Autoplay, EffectCards, EffectCoverflow, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { stripHtml } from "@/lib/html";
import type { CardColumnsPerRow, CardSliderEffect } from "@/lib/page-sections";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/effect-coverflow";
import "swiper/css/effect-cards";

export type InsightCard = {
  title: string;
  summary: string;
  href: string;
  image?: string | null;
  category?: string;
};

const FALLBACK: InsightCard[] = [
  {
    title: "Açık kaynak projelere katkı neden önemli?",
    summary: "Topluluk, görünürlük ve teknik derinlik için pratik bir rehber.",
    href: "/blog",
    category: "Geliştirme",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "İlk web geliştirme işinden çıkarılan dersler",
    summary: "Üretim ortamında öğrenilenler ve kaçınılması gereken tuzaklar.",
    href: "/blog",
    category: "Kariyer",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Node.js projelerinde API entegrasyonu",
    summary: "Güvenli, sürdürülebilir entegrasyon kalıpları ve örnekler.",
    href: "/blog",
    category: "Teknik",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  },
];

function InsightArticle({ post }: { post: InsightCard }) {
  const summary =
    stripHtml(post.summary) || "Yazıyı okumak için tıklayın.";

  return (
    <article className="group h-full overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/11] overflow-hidden">
        <SiteImage
          src={
            post.image ||
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
          }
          alt={post.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {post.category ? (
          <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-site-primary shadow">
            {post.category}
          </span>
        ) : null}
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-site-fg group-hover:text-site-primary">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-site-muted">{summary}</p>
        <SiteLink
          href={post.href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-site-primary"
        >
          Okumaya devam
          <ArrowRight className="h-4 w-4" />
        </SiteLink>
      </div>
    </article>
  );
}

export function HomeInsights({
  posts,
  title,
  subtitle,
  eyebrow,
  enableSlider = false,
  sliderAutoplay = true,
  sliderEffect = "slide",
  cardsPerRow = 3,
}: {
  posts?: InsightCard[];
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  enableSlider?: boolean;
  sliderAutoplay?: boolean;
  sliderEffect?: CardSliderEffect;
  cardsPerRow?: CardColumnsPerRow;
}) {
  const items = posts && posts.length > 0 ? posts : FALLBACK;
  const heading = title?.trim() || "Dünyanın en iyilerine ulaşın";
  const lead =
    subtitle?.trim() || "Müşterilerimizin bizi tercih etmesinin birkaç nedeni.";
  const badge = eyebrow?.trim() || "Neden biz?";
  const columns: CardColumnsPerRow =
    cardsPerRow === 4 || cardsPerRow === 5 ? cardsPerRow : 3;

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
      ? "mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : columns === 4
        ? "mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "mt-10 grid gap-6 md:grid-cols-3";

  const shellClass =
    columns === 5
      ? "mx-auto w-full max-w-[112rem] px-4 sm:px-6 lg:px-8 xl:px-10"
      : columns === 4
        ? "mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8"
        : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  const sliderBreakpoints =
    effect === "cards" || effect === "fade"
      ? undefined
      : {
          640: { slidesPerView: Math.min(2, columns), spaceBetween: 16 },
          900: { slidesPerView: Math.min(3, columns), spaceBetween: 20 },
          1100: {
            slidesPerView:
              effect === "coverflow"
                ? Math.min(2.4, columns)
                : Math.min(4, columns),
            spaceBetween: 24,
          },
          1400: {
            slidesPerView:
              effect === "coverflow" ? Math.min(2.8, columns) : columns,
            spaceBetween: 24,
          },
        };

  const uid = useId().replace(/:/g, "");
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  return (
    <section className="py-20">
      <div className={shellClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-site-primary">{badge}</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-2 text-site-muted">{lead}</p>
          </div>
          {enableSlider ? (
            <div className="flex gap-2">
              <button
                ref={prevRef}
                type="button"
                className={`blog-swiper-prev-${uid} inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted transition hover:border-site-primary/40 hover:text-site-primary`}
                aria-label="Önceki"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                ref={nextRef}
                type="button"
                className={`blog-swiper-next-${uid} inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted transition hover:border-site-primary/40 hover:text-site-primary`}
                aria-label="Sonraki"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {enableSlider ? (
          <div className="site-cards-swiper mt-10">
            <Swiper
              modules={modules}
              effect={effect === "slide" ? "slide" : effect}
              grabCursor
              loop={items.length > columns}
              speed={700}
              spaceBetween={24}
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
              navigation={{
                prevEl: `.blog-swiper-prev-${uid}`,
                nextEl: `.blog-swiper-next-${uid}`,
              }}
              pagination={{ clickable: true }}
              breakpoints={sliderBreakpoints}
              onBeforeInit={(swiper: SwiperType) => {
                const nav = swiper.params.navigation;
                if (nav && typeof nav !== "boolean") {
                  nav.prevEl = prevRef.current;
                  nav.nextEl = nextRef.current;
                }
              }}
              className="!pb-12"
            >
              {items.map((post, index) => (
                <SwiperSlide
                  key={`${post.href}-${post.title}-${index}`}
                  className="!h-auto"
                >
                  <div className="h-full px-1 py-2">
                    <InsightArticle post={post} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div className={gridClass}>
            {items.map((post, index) => (
              <InsightArticle
                key={`${post.href}-${post.title}-${index}`}
                post={post}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
