"use client";

import { SiteLink } from "@/components/site/site-link";
import { useState } from "react";
import {
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useSiteTheme } from "./site-theme-provider";
import type { SiteHeaderProps, SiteNavItem } from "./site-types";

function NavDropdown({ item }: { item: SiteNavItem }) {
  const hasChildren = Boolean(item.children?.length);

  if (!hasChildren) {
    return (
      <SiteLink
        href={item.href}
        className="px-3 py-2 text-sm font-medium text-site-fg/80 transition hover:text-site-primary"
      >
        {item.label}
      </SiteLink>
    );
  }

  return (
    <div className="group relative">
      <SiteLink
        href={item.href}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-site-fg/80 transition hover:text-site-primary"
      >
        {item.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180" />
      </SiteLink>
      <div className="invisible absolute top-full left-0 z-50 min-w-[200px] translate-y-2 rounded-2xl border border-site-border bg-site-card p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {item.children!.map((child) => (
          <SiteLink
            key={child.href + child.label}
            href={child.href}
            className="block rounded-xl px-3 py-2 text-sm text-site-fg/80 transition hover:bg-site-primary-soft hover:text-site-primary"
          >
            {child.label}
          </SiteLink>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader({
  siteName,
  phone,
  email,
  address,
  hours,
  ctaLabel = "Teklif Alın",
  ctaHref = "/iletisim",
  items,
  membershipEnabled = false,
  memberLoggedIn = false,
  memberName,
}: SiteHeaderProps) {
  const { isDark, toggleTheme } = useSiteTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-site-border/70 bg-site-bg/90 backdrop-blur-xl">
      {(phone || email || address || hours) && (
        <div className="hidden border-b border-site-border/60 bg-site-surface/80 lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs text-site-muted sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4">
              {phone ? (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-site-primary">
                  <Phone className="h-3.5 w-3.5" />
                  {phone}
                </a>
              ) : null}
              {address ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {hours ? <span>{hours}</span> : null}
              {email ? (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-site-primary">
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <SiteLink href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-site-primary text-sm font-bold text-white shadow-md shadow-violet-500/30">
            {siteName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-lg font-bold tracking-tight text-site-fg">
            {siteName}
          </span>
        </SiteLink>

        <nav className="ml-auto hidden items-center lg:flex">
          {items.map((item) => (
            <NavDropdown key={item.label + item.href} item={item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <button
            type="button"
            aria-label="Ara"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-site-muted transition hover:bg-site-surface hover:text-site-fg"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Aydınlık tema" : "Karanlık tema"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-site-muted transition hover:bg-site-surface hover:text-site-fg"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {membershipEnabled ? (
            memberLoggedIn ? (
              <SiteLink
                href="/uye"
                className="hidden rounded-full border border-site-border px-4 py-2.5 text-sm font-semibold text-site-fg transition hover:bg-site-surface sm:inline-flex"
              >
                {memberName ? memberName.split(" ")[0] : "Hesabım"}
              </SiteLink>
            ) : (
              <SiteLink
                href="/giris"
                className="hidden rounded-full border border-site-border px-4 py-2.5 text-sm font-semibold text-site-fg transition hover:bg-site-surface sm:inline-flex"
              >
                Giriş
              </SiteLink>
            )
          ) : null}
          <SiteLink
            href={ctaHref}
            className="hidden rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:brightness-110 sm:inline-flex"
          >
            {ctaLabel}
          </SiteLink>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-fg lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menü"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-site-border bg-site-bg px-4 py-4 lg:hidden">
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.label + item.href}>
                <SiteLink
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-site-fg hover:bg-site-primary-soft"
                >
                  {item.label}
                </SiteLink>
                {item.children?.map((child) => (
                  <SiteLink
                    key={child.href + child.label}
                    href={child.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl py-2 pr-3 pl-6 text-sm text-site-muted hover:text-site-primary"
                  >
                    {child.label}
                  </SiteLink>
                ))}
              </div>
            ))}
          </div>
          {membershipEnabled ? (
            memberLoggedIn ? (
              <SiteLink
                href="/uye"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center justify-center rounded-full border border-site-border px-4 py-3 text-sm font-semibold text-site-fg"
              >
                Hesabım
              </SiteLink>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SiteLink
                  href="/giris"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-full border border-site-border px-4 py-3 text-sm font-semibold text-site-fg"
                >
                  Giriş
                </SiteLink>
                <SiteLink
                  href="/kayit"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-full bg-site-primary px-4 py-3 text-sm font-semibold text-white"
                >
                  Kayıt
                </SiteLink>
              </div>
            )
          ) : null}
          <SiteLink
            href={ctaHref}
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center rounded-full bg-site-primary px-4 py-3 text-sm font-semibold text-white"
          >
            {ctaLabel}
          </SiteLink>
        </div>
      ) : null}
    </header>
  );
}
