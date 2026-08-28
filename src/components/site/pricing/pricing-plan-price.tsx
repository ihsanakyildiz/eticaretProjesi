import type { ResolvedPlanPrice } from "@/lib/pricing";

export function PricingPlanPrice({
  resolved,
  showPeriod,
  periodLabel,
  size = "lg",
  tone = "default",
}: {
  resolved: ResolvedPlanPrice;
  showPeriod: boolean;
  periodLabel: string;
  size?: "lg" | "xl";
  tone?: "default" | "featured" | "onDark";
}) {
  const muted =
    tone === "featured" || tone === "onDark"
      ? "text-white/70"
      : "text-site-muted";
  const main =
    tone === "featured" || tone === "onDark" ? "text-white" : "text-site-fg";
  const priceSize =
    resolved.kind === "QUOTE"
      ? size === "xl"
        ? "text-3xl font-extrabold tracking-tight sm:text-4xl"
        : "text-3xl font-extrabold tracking-tight"
      : resolved.kind === "RANGE"
        ? size === "xl"
          ? "text-3xl font-extrabold tracking-tight sm:text-4xl"
          : "text-3xl font-extrabold tracking-tight"
        : size === "xl"
          ? "text-4xl font-extrabold tracking-tight sm:text-5xl"
          : "text-4xl font-extrabold tracking-tight";

  const showPeriodLabel =
    showPeriod && resolved.kind !== "QUOTE" && periodLabel.trim().length > 0;

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
      {resolved.compareAt ? (
        <span className={`text-base font-medium line-through ${muted}`}>
          {resolved.compareAt}
        </span>
      ) : null}
      <p className={`${priceSize} ${main}`}>
        {resolved.price}
        {showPeriodLabel ? (
          <span className={`ml-1 text-sm font-medium ${muted}`}>
            / {periodLabel}
          </span>
        ) : null}
      </p>
      {resolved.discounted ? (
        <span
          className={`mb-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
            tone === "featured" || tone === "onDark"
              ? "bg-white/20 text-white"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          İndirim
        </span>
      ) : null}
    </div>
  );
}
