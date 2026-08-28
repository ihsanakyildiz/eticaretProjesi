/** Proje rolü seçenekleri (admin form) */
export const PROJECT_ROLE_OPTIONS = [
  "Tasarım",
  "Geliştirme",
  "Tasarım + Geliştirme",
  "Danışmanlık",
  "Tam paket",
] as const;

export type ProjectRoleOption = (typeof PROJECT_ROLE_OPTIONS)[number];

export const PROJECT_METRIC_MAX = 4;
export const PROJECT_GALLERY_MAX = 12;
export const PROJECT_HIGHLIGHT_MAX = 8;

export type ProjectMetricInput = {
  label: string;
  value: string;
};

export function parseProjectHighlights(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, PROJECT_HIGHLIGHT_MAX);
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, PROJECT_HIGHLIGHT_MAX);
  }
}

export function serializeProjectHighlights(items: string[]): string | null {
  const cleaned = items.map((item) => item.trim()).filter(Boolean).slice(0, PROJECT_HIGHLIGHT_MAX);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

export function parseProjectMetricsJson(raw: string): ProjectMetricInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const label = String((item as { label?: unknown }).label ?? "").trim();
        const value = String((item as { value?: unknown }).value ?? "").trim();
        if (!label || !value) return null;
        return { label: label.slice(0, 100), value: value.slice(0, 100) };
      })
      .filter((item): item is ProjectMetricInput => Boolean(item))
      .slice(0, PROJECT_METRIC_MAX);
  } catch {
    return [];
  }
}

export type GalleryOrderItem =
  | { type: "existing"; id: string }
  | { type: "new"; index: number };

export function parseGalleryOrderJson(raw: string): GalleryOrderItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: GalleryOrderItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const type = (item as { type?: unknown }).type;
      if (type === "existing") {
        const id = String((item as { id?: unknown }).id ?? "").trim();
        if (id) items.push({ type: "existing", id });
      } else if (type === "new") {
        const index = Number((item as { index?: unknown }).index);
        if (Number.isInteger(index) && index >= 0) {
          items.push({ type: "new", index });
        }
      }
    }
    return items.slice(0, PROJECT_GALLERY_MAX);
  } catch {
    return [];
  }
}

export function normalizeProjectUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.slice(0, 500);
  return `https://${value}`.slice(0, 500);
}
