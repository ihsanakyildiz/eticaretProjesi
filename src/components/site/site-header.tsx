"use client";

import { SiteLink } from "@/components/site/site-link";
import { useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Sun,
  User,
  X,
} from "lucide-react";
import { CartIcon } from "@/components/site/cart/cart-icon";
import { SiteCategoryNav, SiteMobileCategoryList } from "./site-category-nav";
import { SiteHeaderSearch } from "./site-header-search";
import { useSiteTheme } from "./site-theme-provider";
import type { SiteHeaderProps } from "./site-types";

export function SiteHeader({
  siteName,
  phone,
  email,
  address,
  hours,
  pageItems,
  categoryItems,
  membershipEnabled = false,
  memberLoggedIn = false,
}: SiteHeaderProps) {
  const { isDark, toggleTheme } = useSiteTheme();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-site-border/80 bg-site-bg/95 backdrop-blur-xl">
      <div className="hidden border-b border-site-border/70 bg-site-surface/90 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs text-site-muted sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-site-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </a>
            ) : null}
            {hours ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {hours}
              </span>
            ) : null}
            {address ? (
              <span className="hidden max-w-xs truncate xl:inline-flex xl:items-center xl:gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {address}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {pageItems.map((item) => (
              <SiteLink
                key={item.href + item.label}
                href={item.href}
                className="hover:text-site-primary"
              >
                {item.label}
              </SiteLink>
            ))}
            {email ? (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-site-primary">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <SiteLink href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-site-primary text-sm font-bold text-white shadow-md shadow-violet-500/30">
            {siteName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-lg font-semibold tracking-tight text-site-fg">
            {siteName}
          </span>
        </SiteLink>

        <SiteHeaderSearch className="hidden min-w-0 flex-1 lg:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Aydınlık tema" : "Karanlık tema"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-site-muted transition hover:bg-site-surface hover:text-site-fg"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {memberLoggedIn ? (
            <SiteLink
              href="/uye"
              className="hidden items-center gap-1.5 rounded-full border border-site-border px-3 py-2 text-sm font-semibold text-site-fg transition hover:bg-site-surface sm:inline-flex"
            >
              <User className="h-4 w-4" />
              Hesabım
            </SiteLink>
          ) : membershipEnabled ? (
            <SiteLink
              href="/giris"
              className="hidden items-center gap-1.5 rounded-full border border-site-border px-3 py-2 text-sm font-semibold text-site-fg transition hover:bg-site-surface sm:inline-flex"
            >
              <User className="h-4 w-4" />
              Giriş
            </SiteLink>
          ) : null}
          <CartIcon variant="cta" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-fg lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menü"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {categoryItems.length > 0 ? (
        <div className="border-t border-site-border/80 bg-site-bg">
          <SiteCategoryNav items={categoryItems} />
        </div>
      ) : null}

      {open ? (
        <div className="border-t border-site-border bg-site-bg px-4 py-4 lg:hidden">
          <SiteHeaderSearch className="mb-4" autoFocus />
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
            Sayfalar
          </p>
          <div className="space-y-0.5">
            {pageItems.map((item) => (
              <SiteLink
                key={item.href + item.label}
                href={item.href}
                onClick={closeMenu}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-site-fg hover:bg-site-primary-soft"
              >
                {item.label}
              </SiteLink>
            ))}
          </div>
          <SiteMobileCategoryList items={categoryItems} onNavigate={closeMenu} />
          {memberLoggedIn ? (
            <SiteLink
              href="/uye"
              onClick={closeMenu}
              className="mt-3 flex items-center justify-center rounded-full border border-site-border px-4 py-3 text-sm font-semibold text-site-fg"
            >
              Hesabım
            </SiteLink>
          ) : membershipEnabled ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SiteLink
                href="/giris"
                onClick={closeMenu}
                className="flex items-center justify-center rounded-full border border-site-border px-4 py-3 text-sm font-semibold text-site-fg"
              >
                Giriş
              </SiteLink>
              <SiteLink
                href="/kayit"
                onClick={closeMenu}
                className="flex items-center justify-center rounded-full bg-site-primary px-4 py-3 text-sm font-semibold text-white"
              >
                Kayıt
              </SiteLink>
            </div>
          ) : null}
          <div className="mt-4 flex justify-center">
            <CartIcon variant="cta" onNavigate={closeMenu} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
