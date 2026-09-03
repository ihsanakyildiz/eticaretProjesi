export type CheckoutAddress = {
  id: string;
  alias: string;
  firstName: string;
  lastName: string;
  company: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  district: string | null;
  city: string;
  neighborhood: string | null;
  postalCode: string | null;
  country: string;
  isDelivery: boolean;
  isInvoice: boolean;
  isDefaultDelivery: boolean;
  isDefaultInvoice: boolean;
  isCorporateInvoice: boolean;
};

export type CheckoutCarrier = {
  id: string;
  name: string;
  logo: string | null;
  priceMinor: number;
};

export type CartDeliveryCode = "SAME_DAY" | "DAYS_1_3" | "DAYS_3_5" | "DAYS_5_10";

export const CART_LINE_ISSUES = [
  "MISSING",
  "INACTIVE_VARIANT",
  "INACTIVE_PRODUCT",
  "HIDDEN",
  "NOT_FOR_SALE",
  "OUT_OF_STOCK",
  "NO_PRICE",
] as const;

export type CartLineIssueCode = (typeof CART_LINE_ISSUES)[number];

export type CartNoticeKind = "removed" | "price_up" | "price_down" | "qty_adjusted";

export type CartNotice = {
  id: string;
  kind: CartNoticeKind;
  message: string;
};

export type CartPriceChange = {
  fromMinor: number;
  toMinor: number;
};

export type HydratedCartLine = {
  variantId: string;
  productId: string;
  title: string;
  brandName: string | null;
  variantTitle: string | null;
  href: string;
  sku: string | null;
  image: string | null;
  quantity: number;
  unitPriceMinor: number;
  compareAtMinor: number | null;
  savingsMinor: number;
  taxRatePercent: number;
  totalMinor: number;
  extraShippingMinor: number;
  maxQuantity: number | null;
  minOrderQty: number;
  quantityStep: number;
  estimatedDelivery: CartDeliveryCode | null;
  available: boolean;
  issue: CartLineIssueCode | null;
  priceChange: CartPriceChange | null;
  qtyAdjustedFrom: number | null;
};

export type HydratedCart = {
  lines: HydratedCartLine[];
  productsMinor: number;
  taxMinor: number;
  extraShippingMinor: number;
};
