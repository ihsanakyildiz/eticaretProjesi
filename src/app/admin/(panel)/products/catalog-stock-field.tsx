"use client";

import Link from "next/link";

export function catalogStockInputClass(base: string, locked: boolean) {
  return locked ? `${base} cursor-not-allowed bg-[#f3f6f9] text-slate-600` : base;
}

export function CatalogStockHint({ locked }: { locked: boolean }) {
  if (!locked) return null;
  return (
    <p className="mt-1.5 text-xs text-slate-500">
      Stok yalnızca gelişmiş stok sisteminden (irsaliye, sayım, düzeltme) değişir.{" "}
      <Link href="/admin/inventory" className="font-medium text-[#0ab39c] hover:underline">
        Stok ve depolar
      </Link>
    </p>
  );
}
