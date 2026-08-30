import type { ProductAttributeDisplayType } from "@prisma/client";

export const PRODUCT_ATTRIBUTE_DISPLAY_TYPES = [
  "TEXT",
  "BUTTON",
  "COLOR",
  "IMAGE",
] as const satisfies readonly ProductAttributeDisplayType[];

export type ProductAttributeDisplayTypeValue =
  (typeof PRODUCT_ATTRIBUTE_DISPLAY_TYPES)[number];

export function isProductAttributeDisplayType(
  value: string,
): value is ProductAttributeDisplayTypeValue {
  return (PRODUCT_ATTRIBUTE_DISPLAY_TYPES as readonly string[]).includes(value);
}

export function productAttributeDisplayLabel(
  type: ProductAttributeDisplayType,
): string {
  switch (type) {
    case "TEXT":
      return "Metin";
    case "BUTTON":
      return "Buton";
    case "COLOR":
      return "Renk";
    case "IMAGE":
      return "Görsel";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function productAttributeDisplayHint(
  type: ProductAttributeDisplayType,
): string {
  switch (type) {
    case "TEXT":
      return "Beden, numara, malzeme gibi metin seçenekleri.";
    case "BUTTON":
      return "Vitrinde yan yana tıklanabilir kutular gösterilir.";
    case "COLOR":
      return "Vitrinde renk noktası (swatch) gösterilir.";
    case "IMAGE":
      return "Desen veya kumaş için küçük görsel swatch.";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidColorHex(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

export function fallbackSwatchHex(name: string, colorHex: string | null): string {
  if (colorHex && isValidColorHex(colorHex)) return colorHex.trim();
  switch (name.trim().toLocaleLowerCase("tr-TR")) {
    case "siyah":
    case "black":
      return "#111827";
    case "beyaz":
    case "white":
      return "#ffffff";
    case "kırmızı":
    case "kirmizi":
    case "red":
      return "#dc2626";
    case "sarı":
    case "sari":
    case "yellow":
      return "#eab308";
    case "yeşil":
    case "yesil":
    case "green":
      return "#16a34a";
    case "mavi":
    case "blue":
      return "#2563eb";
    default:
      return "#94a3b8";
  }
}
