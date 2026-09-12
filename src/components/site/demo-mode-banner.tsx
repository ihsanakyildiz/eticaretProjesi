import { FlaskConical } from "lucide-react";
import type { DemoNotice } from "@/lib/site-access";

function bannerClass(variant: "bar" | "panel") {
  switch (variant) {
    case "bar":
      return "border-b border-amber-300 bg-amber-50";
    case "panel":
      return "mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 shadow-sm";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function bannerInnerClass(variant: "bar" | "panel") {
  switch (variant) {
    case "bar":
      return "mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:px-6 lg:px-8";
    case "panel":
      return "flex items-start gap-3 px-4 py-4 sm:px-5";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function DemoModeBanner({
  notice,
  variant = "bar",
}: {
  notice: DemoNotice;
  variant?: "bar" | "panel";
}) {
  return (
    <div role="status" className={bannerClass(variant)}>
      <div className={bannerInnerClass(variant)}>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
          <FlaskConical className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-amber-800">Demo modu</p>
          <p className="font-display text-base font-bold text-amber-950 sm:text-lg">{notice.title}</p>
          {notice.message ? (
            <p className="mt-1 text-sm leading-relaxed text-amber-900">{notice.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
