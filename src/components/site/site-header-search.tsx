"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Award,
  Clock,
  Flame,
  Loader2,
  Search,
  Tag,
  X,
} from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useCatalogUrls } from "@/components/site/site-url-provider";
import { fetchRecentlyViewedProducts } from "@/components/site/catalog/catalog-client-api";
import { catalogCardPrice, type CatalogProductCard } from "@/lib/catalog-storefront";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";
import { RECENTLY_VIEWED_KEY } from "@/lib/recently-viewed";
import {
  catalogSearchHref,
  displaySearchTerm,
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_MAX,
  type SearchSuggestEntity,
  type SearchSuggestResponse,
} from "@/lib/search-suggest-types";

const emptySuggest: SearchSuggestResponse = {
  terms: [],
  categories: [],
  brands: [],
  products: [],
};

function readHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

function rememberHistory(raw: string) {
  const value = displaySearchTerm(raw);
  if (value.length < 2) return;
  const next = [value, ...readHistory().filter((item) => item.toLocaleLowerCase("tr-TR") !== value.toLocaleLowerCase("tr-TR"))].slice(
    0,
    SEARCH_HISTORY_MAX,
  );
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
}

function readRecentIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item)).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}

function logSearch(raw: string) {
  const q = displaySearchTerm(raw);
  if (q.length < 2) return;
  try {
    void fetch("/api/catalog/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
      keepalive: true,
    });
  } catch {
    /* arama kaydı vitrini bloklamasın */
  }
}

function highlightMatch(text: string, query: string) {
  const needle = query.trim();
  if (!needle) return text;
  const hay = text.toLocaleLowerCase("tr-TR");
  const find = needle.toLocaleLowerCase("tr-TR");
  const index = hay.indexOf(find);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-site-primary/15 font-semibold text-site-fg">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

type FlatItem = {
  id: string;
  href: string;
  query?: string;
};

export function SiteHeaderSearch({
  className = "",
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const { catalogPath, productHref } = useCatalogUrls();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<SearchSuggestResponse>(emptySuggest);
  const [history, setHistory] = useState<string[]>([]);
  const [recent, setRecent] = useState<CatalogProductCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const isTyping = trimmed.length > 0;

  useEffect(() => {
    if (!open) return;
    setHistory(readHistory());
    const ids = readRecentIds();
    if (ids.length === 0) {
      setRecent([]);
      return;
    }
    void fetchRecentlyViewedProducts(ids).then(setRecent);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/catalog/search-suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as SearchSuggestResponse;
        setSuggest({
          terms: Array.isArray(data.terms) ? data.terms : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
          brands: Array.isArray(data.brands) ? data.brands : [],
          products: Array.isArray(data.products) ? data.products : [],
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    }, isTyping ? 180 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmed, isTyping]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    if (!isTyping) {
      for (const item of history) {
        items.push({
          id: `history-${item}`,
          href: catalogSearchHref(catalogPath, item),
          query: item,
        });
      }
      for (const item of suggest.terms) {
        items.push({ id: `term-${item.term}`, href: item.href, query: item.display });
      }
      for (const product of recent) {
        items.push({
          id: `recent-${product.id}`,
          href: productHref(product.slug, product.urlId),
        });
      }
      return items;
    }
    for (const item of suggest.terms) {
      items.push({ id: `term-${item.term}`, href: item.href, query: item.display });
    }
    for (const item of suggest.categories) {
      items.push({ id: `cat-${item.id}`, href: item.href });
    }
    for (const item of suggest.brands) {
      items.push({ id: `brand-${item.id}`, href: item.href });
    }
    for (const item of suggest.products) {
      items.push({ id: `product-${item.id}`, href: item.href });
    }
    if (trimmed) {
      items.push({
        id: "more",
        href: catalogSearchHref(catalogPath, trimmed),
        query: trimmed,
      });
    }
    return items;
  }, [catalogPath, history, isTyping, productHref, recent, suggest, trimmed]);

  const commitSearch = (raw: string) => {
    const value = displaySearchTerm(raw);
    if (value.length < 2) return;
    rememberHistory(value);
    setHistory(readHistory());
    logSearch(value);
  };

  const go = (item: FlatItem) => {
    if (item.query) commitSearch(item.query);
    setOpen(false);
    window.location.assign(item.href);
  };

  const hasEmptyContent =
    history.length > 0 || suggest.terms.length > 0 || recent.length > 0;
  const hasTypedContent =
    suggest.terms.length > 0 ||
    suggest.categories.length > 0 ||
    suggest.brands.length > 0 ||
    suggest.products.length > 0;
  const showPanel = open && (loading || (isTyping ? hasTypedContent || trimmed.length > 0 : hasEmptyContent));

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form
        action={catalogPath}
        method="get"
        onSubmit={() => commitSearch(trimmed)}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-site-muted" />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          name="q"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Ürün, kategori veya marka ara"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={`${listId}-panel`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (!showPanel || flatItems.length === 0) {
              if (event.key === "Escape") setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((prev) => (prev + 1) % flatItems.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            } else if (event.key === "Enter" && activeIndex >= 0) {
              const item = flatItems[activeIndex];
              if (item) {
                event.preventDefault();
                go(item);
              }
            }
          }}
          className="h-11 w-full rounded-full border border-site-border bg-site-surface pr-10 pl-10 text-sm text-site-fg outline-none transition placeholder:text-site-muted focus:border-site-primary focus:bg-site-card focus:ring-2 focus:ring-site-primary/20"
        />
        {query ? (
          <button
            type="button"
            aria-label="Temizle"
            onClick={() => {
              setQuery("");
              setSuggest(emptySuggest);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-3 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-site-muted hover:bg-site-surface hover:text-site-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {showPanel ? (
        <div
          id={`${listId}-panel`}
          role="listbox"
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-[70] overflow-hidden rounded-2xl border border-site-border bg-site-card shadow-xl shadow-slate-900/10"
        >
          <div className="max-h-[min(32rem,70vh)] overflow-y-auto py-2">
            {loading && !hasTypedContent && isTyping ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-site-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aranıyor…
              </div>
            ) : null}

            {!isTyping && history.length > 0 ? (
              <section className="px-3 pb-2">
                <div className="mb-1 flex items-center justify-between px-1">
                  <p className="text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                    Geçmiş aramalar
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.localStorage.removeItem(SEARCH_HISTORY_KEY);
                      setHistory([]);
                    }}
                    className="text-[11px] font-medium text-site-muted hover:text-site-fg"
                  >
                    Temizle
                  </button>
                </div>
                {history.map((item, index) => (
                  <SuggestRow
                    key={`h-${item}`}
                    active={flatItems[activeIndex]?.id === `history-${item}`}
                    href={catalogSearchHref(catalogPath, item)}
                    onClick={() =>
                      go({
                        id: `history-${item}`,
                        href: catalogSearchHref(catalogPath, item),
                        query: item,
                      })
                    }
                    icon={<Clock className="h-4 w-4" />}
                    label={item}
                    index={index}
                  />
                ))}
              </section>
            ) : null}

            {suggest.terms.length > 0 ? (
              <section className="px-3 pb-2">
                <p className="mb-1 px-1 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                  {isTyping ? "Önerilen aramalar" : "Popüler aramalar"}
                </p>
                {isTyping ? (
                  suggest.terms.map((item) => (
                    <SuggestRow
                      key={item.term}
                      active={flatItems[activeIndex]?.id === `term-${item.term}`}
                      href={item.href}
                      onClick={() =>
                        go({ id: `term-${item.term}`, href: item.href, query: item.display })
                      }
                      icon={<Search className="h-4 w-4" />}
                      label={highlightMatch(item.display, trimmed)}
                    />
                  ))
                ) : (
                  <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                    {suggest.terms.map((item) => (
                      <SiteLink
                        key={item.term}
                        href={item.href}
                        onClick={() => commitSearch(item.display)}
                        className="inline-flex items-center gap-1 rounded-full border border-site-border bg-site-surface px-2.5 py-1 text-xs font-medium text-site-fg hover:border-site-primary/40"
                      >
                        <Flame className="h-3 w-3 text-site-primary" />
                        {item.display}
                      </SiteLink>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {isTyping && suggest.categories.length > 0 ? (
              <SuggestGroup
                title="Kategoriler"
                items={suggest.categories}
                query={trimmed}
                icon={<Tag className="h-4 w-4" />}
                activeId={flatItems[activeIndex]?.id}
                idPrefix="cat"
                onPick={(item) => go({ id: `cat-${item.id}`, href: item.href })}
              />
            ) : null}

            {isTyping && suggest.brands.length > 0 ? (
              <SuggestGroup
                title="Markalar"
                items={suggest.brands}
                query={trimmed}
                icon={<Award className="h-4 w-4" />}
                activeId={flatItems[activeIndex]?.id}
                idPrefix="brand"
                onPick={(item) => go({ id: `brand-${item.id}`, href: item.href })}
              />
            ) : null}

            {isTyping && suggest.products.length > 0 ? (
              <SuggestGroup
                title="Ürünler"
                items={suggest.products}
                query={trimmed}
                activeId={flatItems[activeIndex]?.id}
                idPrefix="product"
                onPick={(item) => go({ id: `product-${item.id}`, href: item.href })}
              />
            ) : null}

            {!isTyping && recent.length > 0 ? (
              <section className="px-3 pb-2">
                <p className="mb-1 px-1 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                  Önceden gezdiklerim
                </p>
                {recent.map((product) => {
                  const priced = catalogCardPrice(product);
                  return (
                    <SuggestRow
                      key={product.id}
                      active={flatItems[activeIndex]?.id === `recent-${product.id}`}
                      href={productHref(product.slug, product.urlId)}
                      onClick={() =>
                        go({
                          id: `recent-${product.id}`,
                          href: productHref(product.slug, product.urlId),
                        })
                      }
                      image={product.image}
                      label={product.title}
                      meta={
                        product.showPrice
                          ? formatMinorTry(
                              taxIncludedMinor(priced.priceMinor, product.taxRatePercent),
                            )
                          : null
                      }
                    />
                  );
                })}
              </section>
            ) : null}

            {isTyping && trimmed ? (
              <div className="border-t border-site-border px-3 pt-2">
                <SuggestRow
                  active={flatItems[activeIndex]?.id === "more"}
                  href={catalogSearchHref(catalogPath, trimmed)}
                  onClick={() =>
                    go({
                      id: "more",
                      href: catalogSearchHref(catalogPath, trimmed),
                      query: trimmed,
                    })
                  }
                  icon={<Search className="h-4 w-4" />}
                  label={
                    <>
                      Tüm sonuçları gör: <strong>{trimmed}</strong>
                    </>
                  }
                />
              </div>
            ) : null}

            {isTyping && !loading && !hasTypedContent ? (
              <p className="px-4 py-6 text-center text-sm text-site-muted">
                “{trimmed}” için öneri bulunamadı.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestGroup({
  title,
  items,
  query,
  icon,
  activeId,
  idPrefix,
  onPick,
}: {
  title: string;
  items: SearchSuggestEntity[];
  query: string;
  icon?: ReactNode;
  activeId?: string;
  idPrefix: string;
  onPick: (item: SearchSuggestEntity) => void;
}) {
  return (
    <section className="px-3 pb-2">
      <p className="mb-1 px-1 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
        {title}
      </p>
      {items.map((item) => (
        <SuggestRow
          key={item.id}
          active={activeId === `${idPrefix}-${item.id}`}
          href={item.href}
          onClick={() => onPick(item)}
          icon={icon}
          image={item.image}
          label={highlightMatch(item.label, query)}
          meta={item.meta}
        />
      ))}
    </section>
  );
}

function SuggestRow({
  href,
  label,
  meta,
  icon,
  image,
  active,
  onClick,
  index,
}: {
  href: string;
  label: ReactNode;
  meta?: string | null;
  icon?: ReactNode;
  image?: string | null;
  active?: boolean;
  onClick: () => void;
  index?: number;
}) {
  return (
    <SiteLink
      href={href}
      role="option"
      aria-selected={active}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition ${
        active ? "bg-site-primary-soft text-site-fg" : "text-site-fg hover:bg-site-surface"
      }`}
    >
      {image ? (
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-site-surface">
          <SiteImage src={image} alt="" fill className="object-cover" sizes="40px" />
        </span>
      ) : icon ? (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-surface text-site-muted">
          {icon}
        </span>
      ) : (
        <span className="w-8 shrink-0 text-center text-xs text-site-muted">
          {index != null ? index + 1 : null}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta ? (
        <span className="shrink-0 text-xs font-medium text-site-muted">{meta}</span>
      ) : null}
    </SiteLink>
  );
}
