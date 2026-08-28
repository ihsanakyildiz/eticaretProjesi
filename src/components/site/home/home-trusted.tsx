"use client";

import { SiteImage } from "@/components/site/site-image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type TrustedClient = {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  sector: string | null;
};

function ClientCard({
  client,
  dragSafe,
}: {
  client: TrustedClient;
  dragSafe: boolean;
}) {
  const content = (
    <span className="group relative flex h-[88px] w-[200px] shrink-0 items-center justify-center rounded-2xl border border-site-border/80 bg-site-card/90 px-6 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-[0_18px_40px_-20px_rgba(124,58,237,0.45)]">
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 via-transparent to-emerald-400/0 opacity-0 transition group-hover:from-violet-500/10 group-hover:to-emerald-400/10 group-hover:opacity-100" />
      {client.logo ? (
        <span className="relative h-10 w-full">
          <SiteImage
            src={client.logo}
            alt={client.name}
            fill
            className="pointer-events-none object-contain opacity-80 transition group-hover:opacity-100"
            sizes="160px"
            draggable={false}
          />
        </span>
      ) : (
        <span className="relative text-center text-sm font-semibold tracking-tight text-site-fg/55 transition group-hover:text-site-primary">
          {client.name}
        </span>
      )}
    </span>
  );

  if (client.website) {
    return (
      <a
        href={client.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={client.name}
        className="shrink-0"
        draggable={false}
        onClick={(event) => {
          if (!dragSafe) event.preventDefault();
        }}
      >
        {content}
      </a>
    );
  }

  return <div className="shrink-0">{content}</div>;
}

function buildTrack(clients: TrustedClient[]): TrustedClient[] {
  if (clients.length === 0) return [];
  let base = [...clients];
  while (base.length < 8) {
    base = [...base, ...clients];
  }
  return [...base, ...base];
}

export function HomeTrusted({
  clients,
  title,
  subtitle,
}: {
  clients?: TrustedClient[];
  title?: string | null;
  subtitle?: string | null;
}) {
  const list = clients?.filter(Boolean) ?? [];
  const trackItems = buildTrack(list);
  const heading = title?.trim() || "Birlikte çalıştığımız müşteriler";
  const lead = subtitle?.trim() || "Güçlü markalar tarafından tercih ediliyor";

  const scrollerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [dragSafe, setDragSafe] = useState(true);

  const pauseForInteraction = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 2800);
  }, []);

  const scrollByCards = useCallback(
    (direction: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      pauseForInteraction();
      el.scrollBy({ left: direction * 220, behavior: "smooth" });
    },
    [pauseForInteraction],
  );

  // Infinite-feel: when near an edge, jump to the mirrored half
  const normalizeLoop = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft <= 8) {
      el.scrollLeft += half;
    } else if (el.scrollLeft >= half - 8) {
      el.scrollLeft -= half;
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    if (list.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = () => {
      const el = scrollerRef.current;
      if (el && !paused && !draggingRef.current) {
        el.scrollLeft += 0.55;
        normalizeLoop();
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [list.length, paused, normalizeLoop]);

  // Vertical wheel → horizontal scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
      pauseForInteraction();
      normalizeLoop();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [normalizeLoop, pauseForInteraction]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || list.length === 0) return;
    // Start in the middle copy for seamless left/right
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth / 4;
    });
  }, [list.length]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    draggingRef.current = true;
    dragMovedRef.current = false;
    setDragSafe(true);
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startScrollRef.current = el.scrollLeft;
    el.setPointerCapture(event.pointerId);
    pauseForInteraction();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;

    const delta = event.clientX - startXRef.current;
    if (Math.abs(delta) > 6) {
      dragMovedRef.current = true;
      setDragSafe(false);
    }
    el.scrollLeft = startScrollRef.current - delta;
    normalizeLoop();
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    try {
      scrollerRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    // Re-enable links shortly after drag
    window.setTimeout(() => setDragSafe(true), 80);
    pauseForInteraction();
  };

  if (list.length === 0) {
    return (
      <section className="border-y border-site-border/70 bg-site-bg py-14">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-2 text-sm font-medium text-site-muted">{lead}</p>
          <p className="mt-4 text-sm text-site-muted/70">
            Müşteri logoları admin panelinden eklendiğinde burada kayarak görünecek.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-y border-site-border/70 bg-site-bg py-14">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-2 text-sm font-medium tracking-wide text-site-muted">
              {lead}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Sola kaydır"
              onClick={() => scrollByCards(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-site-border bg-site-card text-site-fg shadow-sm transition hover:border-site-primary hover:text-site-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Sağa kaydır"
              onClick={() => scrollByCards(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-site-border bg-site-card text-site-fg shadow-sm transition hover:border-site-primary hover:text-site-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-site-bg to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-site-bg to-transparent sm:w-20" />

        <div
          ref={scrollerRef}
          className="site-clients-scroller flex cursor-grab gap-5 overflow-x-auto px-4 py-2 active:cursor-grabbing sm:px-8 lg:px-12"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {trackItems.map((client, index) => (
            <ClientCard
              key={`${client.id}-${index}`}
              client={client}
              dragSafe={dragSafe}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
