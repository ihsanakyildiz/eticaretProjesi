"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { memberSignOutAction } from "@/app/(site)/uye/actions";

type NavItem = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

const BASE_ITEMS: NavItem[] = [
  { href: "/uye/siparisler", label: "Sipariş bilgilerim", match: "prefix" },
  { href: "/uye/adresler", label: "Adres bilgilerim", match: "prefix" },
  { href: "/uye", label: "Üyelik bilgilerim", match: "exact" },
  { href: "/uye/yorumlar", label: "Ürün yorumlarım", match: "exact" },
];

function accountItems(showSubscriptions: boolean): NavItem[] {
  return showSubscriptions
    ? [...BASE_ITEMS, { href: "/uye/abonelikler", label: "Abonelikler", match: "prefix" }]
    : BASE_ITEMS;
}

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SiteAccountMenu({
  showSubscriptions,
  onNavigate,
}: {
  showSubscriptions: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!rootRef.current || !(target instanceof Node)) return;
      if (rootRef.current.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = accountItems(showSubscriptions);

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-site-border px-3 py-2 text-sm font-semibold text-site-fg transition hover:bg-site-surface"
      >
        <User className="h-4 w-4" />
        Hesabım
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Hesap menüsü"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-site-border bg-site-card shadow-xl"
        >
          <div className="p-2">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <SiteLink
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  role="menuitem"
                  className={
                    active
                      ? "block rounded-xl bg-site-primary px-3 py-2 text-sm font-medium text-white"
                      : "block rounded-xl px-3 py-2 text-sm font-medium text-site-fg hover:bg-site-surface"
                  }
                >
                  {item.label}
                </SiteLink>
              );
            })}
          </div>
          <div className="border-t border-site-border/80 p-2">
            <form action={memberSignOutAction}>
              <button
                type="submit"
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
              >
                Çıkış Yap
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteAccountMobileLinks({
  showSubscriptions,
  onNavigate,
}: {
  showSubscriptions: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = accountItems(showSubscriptions);

  return (
    <div className="mt-3 space-y-0.5">
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-site-muted uppercase">
        Hesabım
      </p>
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <SiteLink
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              active
                ? "block rounded-xl bg-site-primary px-3 py-2.5 text-sm font-medium text-white"
                : "block rounded-xl px-3 py-2.5 text-sm font-medium text-site-fg hover:bg-site-primary-soft"
            }
          >
            {item.label}
          </SiteLink>
        );
      })}
      <form action={memberSignOutAction} className="pt-1">
        <button
          type="submit"
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-100"
        >
          Çıkış Yap
        </button>
      </form>
    </div>
  );
}
