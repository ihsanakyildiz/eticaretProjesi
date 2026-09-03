"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { memberSignOutAction } from "./actions";

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

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MemberAccountNav({ showSubscriptions }: { showSubscriptions: boolean }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(event: MouseEvent) {
      const target = event.target;
      if (!rootRef.current || !(target instanceof Node)) return;
      if (rootRef.current.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const items = showSubscriptions
    ? [...BASE_ITEMS, { href: "/uye/abonelikler", label: "Abonelikler", match: "prefix" as const }]
    : BASE_ITEMS;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-site-border px-4 py-2 text-sm font-semibold text-site-fg transition hover:bg-site-surface"
      >
        <User className="h-4 w-4" />
        Hesabım
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Hesap menüsü"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-site-border bg-white shadow-xl"
        >
          <div className="p-2">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className={
                    active
                      ? "block rounded-xl bg-site-primary px-3 py-2 text-sm font-medium text-white"
                      : "block rounded-xl px-3 py-2 text-sm font-medium text-site-fg hover:bg-site-surface"
                  }
                >
                  {item.label}
                </Link>
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
