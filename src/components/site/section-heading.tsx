import { normalizeSectionText } from "@/lib/section-display-text";

type SectionHeadingProps = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  /** Form ve iletişim kartları gibi dar alanlarda ortala */
  centered?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  centered = false,
  className = "",
}: SectionHeadingProps) {
  const eyebrowText = normalizeSectionText(eyebrow);
  const titleText = normalizeSectionText(title);
  const subtitleText = normalizeSectionText(subtitle);

  if (!eyebrowText && !titleText && !subtitleText) {
    return null;
  }

  return (
    <div
      className={`${centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`.trim()}
    >
      {eyebrowText ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-site-primary uppercase">
          {eyebrowText}
        </p>
      ) : null}
      {titleText ? (
        <h2
          className={`font-display text-2xl font-semibold text-site-fg sm:text-3xl ${
            eyebrowText ? "mt-2" : centered ? "mt-3" : ""
          } ${centered && !eyebrowText ? "sm:text-4xl" : ""}`}
        >
          {titleText}
        </h2>
      ) : null}
      {subtitleText ? (
        <p
          className={`text-sm leading-relaxed text-site-muted sm:text-base ${
            titleText || eyebrowText ? "mt-2" : centered ? "mt-3" : ""
          }`}
        >
          {subtitleText}
        </p>
      ) : null}
    </div>
  );
}
