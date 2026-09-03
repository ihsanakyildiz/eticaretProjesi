"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SiteCategoryNavItem } from "@/components/site/site-types";
import { useCatalogUrls } from "@/components/site/site-url-provider";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MegaColumns({
  category,
  onNavigate,
}: {
  category: SiteCategoryNavItem;
  onNavigate?: () => void;
}) {
  const groups = category.children ?? [];
  const hasGrandchildren = groups.some((group) => Boolean(group.children?.length));

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SiteLink
            href={category.href}
            onClick={onNavigate}
            className="font-display text-base font-bold text-site-fg hover:text-site-primary"
          >
            {category.label}
          </SiteLink>
          <SiteLink
            href={category.href}
            onClick={onNavigate}
            className="inline-flex items-center gap-1 text-xs font-semibold text-site-primary hover:underline"
          >
            Tümünü gör
            <ChevronRight className="h-3.5 w-3.5" />
          </SiteLink>
        </div>
        {hasGrandchildren ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
            {groups.map((group) => (
              <div key={group.href}>
                <SiteLink
                  href={group.href}
                  onClick={onNavigate}
                  className="block text-sm font-semibold text-site-fg hover:text-site-primary"
                >
                  {group.label}
                </SiteLink>
                {group.children?.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {group.children.map((leaf) => (
                      <li key={leaf.href}>
                        <SiteLink
                          href={leaf.href}
                          onClick={onNavigate}
                          className="block text-sm text-site-muted hover:text-site-primary"
                        >
                          {leaf.label}
                        </SiteLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
            {groups.map((group) => (
              <SiteLink
                key={group.href}
                href={group.href}
                onClick={onNavigate}
                className="rounded-lg px-2 py-1.5 text-sm text-site-fg/90 hover:bg-site-primary-soft hover:text-site-primary"
              >
                {group.label}
              </SiteLink>
            ))}
          </div>
        )}
      </div>
      {category.image ? (
        <SiteLink
          href={category.href}
          onClick={onNavigate}
          className="relative hidden h-44 w-40 shrink-0 overflow-hidden rounded-xl border border-site-border bg-site-surface lg:block"
        >
          <SiteImage
            src={category.image}
            alt={category.label}
            fill
            className="object-cover"
            sizes="160px"
          />
        </SiteLink>
      ) : null}
    </div>
  );
}

export function SiteCategoryNav({
  items,
  onNavigate,
}: {
  items: SiteCategoryNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { categoryIndexPath } = useCatalogUrls();
  const panelId = useId();
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const active = items.find((item) => item.href === activeHref) ?? null;

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openItem = (href: string) => {
    cancelClose();
    setActiveHref(href);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setActiveHref(null), 140);
  };

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    setActiveHref(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveHref(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (items.length === 0) return null;

  return (
    <nav
      className="relative hidden lg:block"
      onMouseLeave={scheduleClose}
      aria-label="Ürün kategorileri"
    >
      <div className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        <SiteLink
          href={categoryIndexPath}
          className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent py-3 pr-4 text-sm font-semibold text-site-fg hover:text-site-primary"
        >
          <LayoutGrid className="h-4 w-4" />
          Kategoriler
        </SiteLink>
        {items.map((item) => {
          const current = isActivePath(pathname, item.href);
          const open = activeHref === item.href;
          const hasMega = Boolean(item.children?.length);
          return (
            <SiteLink
              key={item.href}
              href={item.href}
              onMouseEnter={() => (hasMega ? openItem(item.href) : scheduleClose())}
              onFocus={() => (hasMega ? openItem(item.href) : setActiveHref(null))}
              aria-expanded={hasMega ? open : undefined}
              aria-controls={hasMega ? panelId : undefined}
              className={`inline-flex shrink-0 items-center gap-1 border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition ${
                current || open
                  ? "border-site-primary text-site-primary"
                  : "border-transparent text-site-fg/80 hover:text-site-primary"
              }`}
            >
              {item.label}
              {hasMega ? (
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 transition ${open ? "rotate-180" : ""}`}
                />
              ) : null}
            </SiteLink>
          );
        })}
      </div>
      {active?.children?.length ? (
        <div
          id={panelId}
          onMouseEnter={cancelClose}
          className="absolute inset-x-0 top-full z-50 border-t border-site-border bg-site-card shadow-xl"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <MegaColumns category={active} onNavigate={onNavigate} />
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export function SiteMobileCategoryList({
  items,
  onNavigate,
}: {
  items: SiteCategoryNavItem[];
  onNavigate?: () => void;
}) {
  const [openHref, setOpenHref] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="border-t border-site-border pt-3">
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
        Kategoriler
      </p>
      {items.map((item) => {
        const open = openHref === item.href;
        return (
          <div key={item.href}>
            <div className="flex items-center">
              <SiteLink
                href={item.href}
                onClick={onNavigate}
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-site-fg hover:bg-site-primary-soft"
              >
                {item.label}
              </SiteLink>
              {item.children?.length ? (
                <button
                  type="button"
                  aria-label={`${item.label} alt kategoriler`}
                  aria-expanded={open}
                  onClick={() => setOpenHref(open ? null : item.href)}
                  className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-site-muted hover:bg-site-surface"
                >
                  <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                </button>
              ) : null}
            </div>
            {open && item.children?.length ? (
              <div className="pb-2 pl-4">
                {item.children.map((child) => (
                  <div key={child.href}>
                    <SiteLink
                      href={child.href}
                      onClick={onNavigate}
                      className="block rounded-lg px-3 py-1.5 text-sm font-medium text-site-fg/90 hover:text-site-primary"
                    >
                      {child.label}
                    </SiteLink>
                    {child.children?.map((leaf) => (
                      <SiteLink
                        key={leaf.href}
                        href={leaf.href}
                        onClick={onNavigate}
                        className="block rounded-lg py-1 pr-3 pl-6 text-sm text-site-muted hover:text-site-primary"
                      >
                        {leaf.label}
                      </SiteLink>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
