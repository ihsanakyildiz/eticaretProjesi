"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  label = "Puan",
}: {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const px = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";

  return (
    <div className="inline-flex items-center gap-0.5" role={readOnly ? "img" : "radiogroup"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const className = `${px} ${active ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`;
        if (readOnly) {
          return <Star key={star} className={className} aria-hidden />;
        }
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} yıldız`}
            aria-checked={value === star}
            role="radio"
            onClick={() => onChange?.(star)}
            className="rounded-sm p-0.5 transition hover:scale-105"
          >
            <Star className={className} />
          </button>
        );
      })}
    </div>
  );
}
