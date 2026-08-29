"use client";

import { ShoppingBag } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { useCart } from "@/components/site/cart/cart-provider";

export function CartIcon({
  onNavigate,
  variant = "icon",
}: {
  onNavigate?: () => void;
  variant?: "icon" | "cta";
}) {
  const { count } = useCart();
  const label = count > 0 ? `Sepet (${count})` : "Sepet";

  if (variant === "cta") {
    return (
      <SiteLink
        href="/sepet"
        onClick={onNavigate}
        aria-label={count > 0 ? `Sepet, ${count} ürün` : "Sepet"}
        className="relative inline-flex items-center gap-2 rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:brightness-110"
      >
        <ShoppingBag className="h-4 w-4" />
        {label}
      </SiteLink>
    );
  }

  return (
    <SiteLink
      href="/sepet"
      onClick={onNavigate}
      aria-label={count > 0 ? `Sepet, ${count} ürün` : "Sepet"}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-site-muted transition hover:bg-site-surface hover:text-site-fg"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-site-primary px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </SiteLink>
  );
}
