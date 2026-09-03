export const PRODUCT_UPDATE_MODES = ["all", "images", "price", "stock", "sale"] as const;
export type ProductUpdateMode = (typeof PRODUCT_UPDATE_MODES)[number];

export function isProductUpdateMode(value: string): value is ProductUpdateMode {
  return (PRODUCT_UPDATE_MODES as readonly string[]).includes(value);
}

export function productUpdateModeLabel(mode: ProductUpdateMode) {
  switch (mode) {
    case "all":
      return "Her şeyi güncelle";
    case "images":
      return "Görsel güncelle";
    case "price":
      return "Fiyat güncelle";
    case "stock":
      return "Stok güncelle";
    case "sale":
      return "Satışa aç / kapat";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
