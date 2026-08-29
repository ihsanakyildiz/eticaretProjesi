"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberSignOutAction } from "./actions";

type NavItem = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

const BASE_ITEMS: NavItem[] = [
  { href: "/uye", label: "Üyelik bilgilerim", match: "exact" },
  { href: "/uye/adresler", label: "Adres bilgileri", match: "prefix" },
  { href: "/uye/siparisler", label: "Sipariş bilgileri", match: "prefix" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MemberAccountNav({ showSubscriptions }: { showSubscriptions: boolean }) {
  const pathname = usePathname();
  const items = showSubscriptions
    ? [...BASE_ITEMS, { href: "/uye/abonelikler", label: "Abonelikler", match: "prefix" as const }]
    : BASE_ITEMS;

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-full bg-site-primary px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-site-border px-4 py-2 text-sm font-medium text-site-fg hover:bg-site-surface"
            }
          >
            {item.label}
          </Link>
        );
      })}
      <form action={memberSignOutAction}>
        <button
          type="submit"
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600"
        >
          Çıkış Yap
        </button>
      </form>
    </nav>
  );
}
