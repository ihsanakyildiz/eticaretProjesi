import type { CardLayout, CardType } from "@prisma/client";

export const CARD_LAYOUT_OPTIONS: Array<{
  value: CardLayout;
  label: string;
  hint: string;
}> = [
  {
    value: "MEDIA_LEFT",
    label: "Görsel solda",
    hint: "Medya sol, metin sağ — ekran görselindeki yerleşim",
  },
  {
    value: "MEDIA_RIGHT",
    label: "Görsel sağda",
    hint: "Metin sol, medya sağ",
  },
  {
    value: "MEDIA_TOP",
    label: "Görsel üstte",
    hint: "Medya üstte, içerik altta",
  },
  {
    value: "MEDIA_BOTTOM",
    label: "Görsel altta",
    hint: "İçerik üstte, medya altta",
  },
];

export function parseCardFeatures(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
}

export function serializeCardFeatures(features: string[]): string | null {
  const cleaned = features.map((item) => item.trim()).filter(Boolean).slice(0, 12);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

export const CAMPAIGN_BANNER_DEFAULT_TITLE = "Kampanya Banner";

export function isCardType(value: string): value is CardType {
  return value === "CLASSIC" || value === "ADVANCED";
}

export function parseCampaignBannerFlag(
  raw: FormDataEntryValue | null | undefined,
  type: CardType,
): boolean {
  if (type !== "CLASSIC") return false;
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "on" || value === "true" || value === "1";
}

export function isCardLayout(value: string): value is CardLayout {
  return (
    value === "MEDIA_LEFT" ||
    value === "MEDIA_RIGHT" ||
    value === "MEDIA_TOP" ||
    value === "MEDIA_BOTTOM"
  );
}
