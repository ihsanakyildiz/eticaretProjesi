"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
    >
      <Printer className="h-4 w-4" />
      Yazdır
    </button>
  );
}
