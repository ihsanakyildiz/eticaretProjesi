"use client";

type SlidePreviewProps = {
  badgeText: string;
  badgeIcon: string;
  headline: string;
  headlineAccent: string;
  kicker: string;
  subheadline: string;
  ctaLabel: string;
  ctaSecondaryLabel: string;
  trustLabel: string;
  titleColor: string;
  accentColor: string;
  subtitleColor: string;
  ctaBgColor: string;
  ctaTextColor: string;
  titleFont: string;
  titleSizePx: string;
  subtitleSizePx: string;
  overlayPercent: number;
  backgroundStyle: string;
  backgroundImage?: string;
  layout: string;
  showStars: boolean;
  starCount: number;
  showAvatars: boolean;
  logos: { preview: string; label?: string }[];
  collage: { preview: string }[];
  avatars: { preview: string }[];
};

function renderHeadline(headline: string, accent: string, titleColor: string, accentColor: string) {
  if (!accent.trim() || !headline.includes(accent)) {
    return <span style={{ color: titleColor }}>{headline || "Başlık buraya"}</span>;
  }
  const parts = headline.split(accent);
  return (
    <>
      <span style={{ color: titleColor }}>{parts[0]}</span>
      <span style={{ color: accentColor }}>{accent}</span>
      <span style={{ color: titleColor }}>{parts.slice(1).join(accent)}</span>
    </>
  );
}

export function HeroSlidePreview(props: SlidePreviewProps) {
  const styleLayer =
    props.backgroundStyle === "soft-gradient"
      ? `linear-gradient(135deg, ${props.accentColor}14, #ffffff 55%, ${props.accentColor}0a)`
      : props.backgroundStyle === "grid"
        ? `
          linear-gradient(${props.accentColor}12 1px, transparent 1px),
          linear-gradient(90deg, ${props.accentColor}12 1px, transparent 1px)
        `
        : props.backgroundImage
          ? "transparent"
          : "#ffffff";

  const bgSize = props.backgroundStyle === "grid" ? "28px 28px" : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#e9ebec] shadow-sm"
      style={{
        backgroundColor: props.backgroundImage ? "#0f172a" : "#ffffff",
        minHeight: 320,
      }}
    >
      {props.backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: styleLayer.includes("gradient") || styleLayer.includes("linear")
            ? styleLayer
            : undefined,
          backgroundColor:
            !props.backgroundImage && styleLayer === "#ffffff" ? "#ffffff" : undefined,
          backgroundSize: bgSize,
        }}
      />

      {props.overlayPercent > 0 ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `rgba(15,23,42,${props.overlayPercent / 100})` }}
        />
      ) : null}

      <div
        className={`relative grid gap-6 p-6 sm:p-8 ${
          props.layout === "CENTERED"
            ? "place-items-center text-center"
            : props.layout === "FULL_BLEED"
              ? "md:grid-cols-1"
              : "md:grid-cols-2 md:items-center"
        }`}
      >
        <div className={props.layout === "CENTERED" ? "max-w-xl" : "max-w-lg"}>
          {props.badgeText ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: `${props.accentColor}55`,
                color: props.accentColor,
                background: `${props.accentColor}12`,
              }}
            >
              {props.badgeIcon ? <span aria-hidden>✦</span> : null}
              {props.badgeText}
            </span>
          ) : null}

          {props.kicker ? (
            <p
              className="mt-4 text-lg font-semibold"
              style={{ color: props.accentColor }}
            >
              {props.kicker}
            </p>
          ) : null}

          <h3
            className="mt-4 font-bold tracking-tight"
            style={{
              fontFamily: props.titleFont || undefined,
              fontSize: props.titleSizePx ? `${props.titleSizePx}px` : "1.75rem",
              lineHeight: 1.15,
            }}
          >
            {renderHeadline(props.headline, props.headlineAccent, props.titleColor, props.accentColor)}
          </h3>

          <p
            className="mt-3 text-sm leading-relaxed"
            style={{
              color: props.subtitleColor,
              fontSize: props.subtitleSizePx ? `${props.subtitleSizePx}px` : undefined,
            }}
          >
            {props.subheadline || "Alt açıklama buraya gelecek."}
          </p>

          {props.ctaLabel ? (
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold"
              style={{ background: props.ctaBgColor, color: props.ctaTextColor }}
            >
              {props.ctaLabel}
              <span aria-hidden>↗</span>
            </button>
          ) : null}
          {props.ctaSecondaryLabel ? (
            <button
              type="button"
              className="mt-5 ml-2 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              {props.ctaSecondaryLabel}
            </button>
          ) : null}

          {(props.trustLabel || props.logos.length > 0) && (
            <div className={`mt-6 ${props.layout === "CENTERED" ? "flex flex-col items-center" : ""}`}>
              {props.trustLabel ? (
                <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {props.trustLabel}
                </p>
              ) : null}
              {props.logos.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 opacity-70 grayscale">
                  {props.logos.slice(0, 5).map((logo, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${logo.preview}-${index}`}
                      src={logo.preview}
                      alt={logo.label || ""}
                      className="h-6 w-auto max-w-[72px] object-contain"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {props.layout !== "CENTERED" ? (
          <div className="relative min-h-[180px]">
            {props.showAvatars && props.avatars.length > 0 ? (
              <div className="absolute top-2 left-2 z-10 flex -space-x-2">
                {props.avatars.slice(0, 4).map((avatar, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${avatar.preview}-${index}`}
                    src={avatar.preview}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-white object-cover shadow"
                  />
                ))}
              </div>
            ) : null}

            {props.showStars ? (
              <div className="absolute top-3 right-3 z-10 flex gap-0.5 text-amber-400">
                {Array.from({ length: props.starCount }).map((_, index) => (
                  <span key={index}>★</span>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {(props.collage.length > 0
                ? props.collage
                : [{ preview: "" }, { preview: "" }, { preview: "" }]
              )
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={index}
                    className={`overflow-hidden rounded-2xl bg-slate-200/70 ${
                      index === 0 ? "col-span-2 h-28" : "h-24"
                    }`}
                  >
                    {item.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                        Kolaj {index + 1}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
