type StaticHeadTag =
  | { type: "meta"; attrs: Record<string, string> }
  | { type: "link"; attrs: Record<string, string> }
  | { type: "style"; attrs: Record<string, string>; css: string };

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw)) !== null) {
    const name = match[1]!.toLowerCase();
    if (name === "/" || name === "!") continue;
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

/**
 * </head> kodundan crawler’ların ilk HTML’de görmesi gereken
 * meta / link / style etiketlerini çıkarır (script hariç).
 */
export function extractStaticHeadTags(html: string): StaticHeadTag[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const tags: StaticHeadTag[] = [];

  const metaRe = /<meta\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRe.exec(trimmed)) !== null) {
    tags.push({ type: "meta", attrs: parseAttributes(match[1] ?? "") });
  }

  const linkRe = /<link\b([^>]*)\/?>/gi;
  while ((match = linkRe.exec(trimmed)) !== null) {
    tags.push({ type: "link", attrs: parseAttributes(match[1] ?? "") });
  }

  const styleRe = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  while ((match = styleRe.exec(trimmed)) !== null) {
    tags.push({
      type: "style",
      attrs: parseAttributes(match[1] ?? ""),
      css: match[2] ?? "",
    });
  }

  return tags;
}

export function hasCustomCode(value?: string) {
  return Boolean(value?.trim());
}
