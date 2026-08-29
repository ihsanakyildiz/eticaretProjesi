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

export type HydratedCartLine = {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string | null;
  href: string;
  sku: string | null;
  image: string | null;
  quantity: number;
  unitPriceMinor: number;
  taxRatePercent: number;
  totalMinor: number;
  extraShippingMinor: number;
  available: boolean;
};

export type HydratedCart = {
  lines: HydratedCartLine[];
  productsMinor: number;
  taxMinor: number;
  extraShippingMinor: number;
};
