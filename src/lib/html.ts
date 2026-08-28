import { highlightRichCodeBlocks } from "@/lib/highlight-rich-html";

/** HTML içeriğinden düz metin çıkarır (liste/özet satırları için). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareRichHtml(
  html: string | null | undefined,
  options: {
    lazyImages: boolean;
    lazyIframes: boolean;
    disableThirdParty: boolean;
  },
): string {
  if (!html) return "";
  let out = html;

  if (options.disableThirdParty) {
    out = out.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
    out = out.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    out = out.replace(/<(embed|object)\b[\s\S]*?>/gi, "");
  }

  out = out.replace(/<img\b([^>]*?)(\/?)>/gi, (_match, rawAttrs: string, closing: string) => {
    let attrs = rawAttrs;
    if (/\bloading\s*=/i.test(attrs)) {
      attrs = attrs.replace(/\sloading\s*=\s*(['"]).*?\1/i, "");
    }
    if (!/\bdecoding\s*=/i.test(attrs)) {
      attrs += ' decoding="async"';
    }
    attrs += options.lazyImages ? ' loading="lazy"' : ' loading="eager"';
    if (!/\bsizes\s*=/i.test(attrs)) {
      attrs += ' sizes="(max-width: 768px) 100vw, 720px"';
    }
    return `<img${attrs}${closing}>`;
  });

  if (!options.disableThirdParty) {
    out = out.replace(/<iframe\b([^>]*?)>/gi, (match, rawAttrs: string) => {
      if (/\bloading\s*=/i.test(rawAttrs)) return match;
      const loading = options.lazyIframes ? "lazy" : "eager";
      return `<iframe${rawAttrs} loading="${loading}">`;
    });
  }

  return highlightRichCodeBlocks(out);
}
