"use client";

import { X } from "lucide-react";
import type { CartNotice, CartNoticeKind } from "@/lib/checkout-types";

function noticeClass(kind: CartNoticeKind): string {
  switch (kind) {
    case "removed":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "price_up":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "price_down":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "qty_adjusted":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function CartNotices({
  notices,
  onDismiss,
}: {
  notices: CartNotice[];
  onDismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${noticeClass(notice.kind)}`}
        >
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(notice.id)}
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Bildirimi kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
