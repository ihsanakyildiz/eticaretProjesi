"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { usePerformance } from "@/components/site/performance-provider";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

export type HomeWorkItem = {
  id: string;
  title: string;
  href: string;
  image?: string | null;
  previewImage?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
};

export type HomeWorkCategory = {
  id: string;
  name: string;
};

const FALLBACK_WORKS: HomeWorkItem[] = [
  {
    id: "w1",
    title: "Kurumsal Web v1",
    href: "/yapilan-isler",
    categoryId: "c1",
    categoryName: "Kurumsal",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    previewImage:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&h=2400&q=80",
  },
  {
    id: "w2",
    title: "E-Ticaret Vitrin",
    href: "/yapilan-isler",
    categoryId: "c2",
    categoryName: "E-Ticaret",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
    previewImage:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&h=2400&q=80",
  },
  {
    id: "w3",
    title: "Ajans Portföy",
    href: "/yapilan-isler",
    categoryId: "c1",
    categoryName: "Kurumsal",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    previewImage:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&h=2400&q=80",
  },
];

const FALLBACK_CATEGORIES: HomeWorkCategory[] = [
  { id: "c1", name: "Kurumsal" },
  { id: "c2", name: "E-Ticaret" },
];

function WorkPreviewCard({ work }: { work: HomeWorkItem }) {
  const perf = usePerformance();
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [hovered, setHovered] = useState(false);
  const [maxOffset, setMaxOffset] = useState(0);

  const scrollSrc = work.previewImage || work.image;
  const canScroll = Boolean(work.previewImage);

  const measure = () => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return;
    const renderedHeight =
      img.naturalWidth > 0
        ? (img.naturalHeight / img.naturalWidth) * frame.clientWidth
        : img.clientHeight;
    setMaxOffset(Math.max(0, renderedHeight - frame.clientHeight));
  };

  useEffect(() => {
    measure();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [scrollSrc]);

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition duration-300 hover:border-site-primary/35 hover:bg-site-primary-soft/35 hover:shadow-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={frameRef}
        className="relative aspect-[4/3] overflow-hidden bg-slate-100"
      >
        {scrollSrc ? (
          canScroll ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={scrollSrc}
              alt={work.title}
              loading={perf.lazyImages ? "lazy" : "eager"}
              decoding="async"
              onLoad={measure}
              className="absolute top-0 left-0 w-full max-w-none will-change-transform"
              style={{
                transform: `translate3d(0, ${hovered ? -maxOffset : 0}px, 0)`,
                transition: "transform 5s ease-in-out",
              }}
            />
          ) : (
            <SiteImage
              src={scrollSrc}
              alt={work.title}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-site-muted">
            Görsel yok
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-site-primary/0 transition duration-300 group-hover:bg-site-primary/20" />
        <SiteLink
          href={work.href}
          className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-90 rounded-full bg-site-primary px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition duration-300 group-hover:scale-100 group-hover:opacity-100"
        >
          İncele
        </SiteLink>
      </div>
      <div className="px-5 py-4">
        <h3 className="text-center text-base font-semibold text-site-fg">
          {work.title}
        </h3>
      </div>
    </article>
  );
}

export function HomeWorks({
  works,
  categories,
  title,
  subtitle,
  eyebrow,
}: {
  works?: HomeWorkItem[];
  categories?: HomeWorkCategory[];
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
}) {
  const sourceWorks = works && works.length > 0 ? works : FALLBACK_WORKS;
  const sourceCategories =
    categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const heading = title?.trim() || "Hazır ve etkili çalışma örnekleri";
  const lead = subtitle?.trim() || null;
  const badge = eyebrow?.trim() || "••• Yapılan İşler";

  const [activeId, setActiveId] = useState<string>("all");
  const [visibleId, setVisibleId] = useState<string>("all");
  const [fading, setFading] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (visibleId === "all") return sourceWorks;
    return sourceWorks.filter((work) => work.categoryId === visibleId);
  }, [sourceWorks, visibleId]);

  const selectCategory = (id: string) => {
    if (id === activeId || fading) return;
    setActiveId(id);
    setFading(true);
    window.setTimeout(() => {
      startTransition(() => {
        setVisibleId(id);
        setFading(false);
      });
    }, 220);
  };

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            {badge}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          {lead ? <p className="mt-3 text-site-muted">{lead}</p> : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => selectCategory("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeId === "all"
                ? "bg-site-primary text-white shadow-md shadow-violet-500/20"
                : "border border-site-border bg-site-card text-site-fg hover:border-site-primary/40"
            }`}
          >
            Tümü
          </button>
          {sourceCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeId === category.id
                  ? "bg-site-primary text-white shadow-md shadow-violet-500/20"
                  : "border border-site-border bg-site-card text-site-fg hover:border-site-primary/40"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div
          className={`mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
            fading
              ? "translate-y-2 scale-[0.98] opacity-0 transition duration-200"
              : "translate-y-0 scale-100 opacity-100 transition duration-300"
          }`}
        >
          {filtered.length > 0 ? (
            filtered.map((work) => <WorkPreviewCard key={work.id} work={work} />)
          ) : (
            <p className="col-span-full py-12 text-center text-sm text-site-muted">
              Bu kategoride henüz çalışma yok.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
