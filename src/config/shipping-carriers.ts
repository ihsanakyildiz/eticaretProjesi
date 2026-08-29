export const SHIPPING_CARRIER_PROVIDER_IDS = [
  "CUSTOM",
  "YURTICI",
  "ARAS",
  "MNG",
  "PTT",
  "SURAT",
  "UPS",
  "DHL",
  "FEDEX",
  "HOROZ",
  "HEPSIJET",
  "TRENDYOL_EXPRESS",
  "KOLAY_GELSIN",
  "SENDEO",
] as const;

export type ShippingCarrierProviderId = (typeof SHIPPING_CARRIER_PROVIDER_IDS)[number];

export type ShippingCarrierProviderMeta = {
  id: ShippingCarrierProviderId;
  label: string;
  defaultName: string;
  website: string;
  trackingUrlTemplate: string;
  apiPlanned: boolean;
};

export const SHIPPING_CARRIER_PROVIDERS: ShippingCarrierProviderMeta[] = [
  {
    id: "CUSTOM",
    label: "Özel / Diğer",
    defaultName: "",
    website: "",
    trackingUrlTemplate: "",
    apiPlanned: false,
  },
  {
    id: "YURTICI",
    label: "Yurtiçi Kargo",
    defaultName: "Yurtiçi Kargo",
    website: "https://www.yurticikargo.com",
    trackingUrlTemplate:
      "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={tracking}",
    apiPlanned: true,
  },
  {
    id: "ARAS",
    label: "Aras Kargo",
    defaultName: "Aras Kargo",
    website: "https://www.araskargo.com.tr",
    trackingUrlTemplate: "https://kargotakip.araskargo.com.tr/mainpage.aspx?code={tracking}",
    apiPlanned: true,
  },
  {
    id: "MNG",
    label: "MNG Kargo",
    defaultName: "MNG Kargo",
    website: "https://www.mngkargo.com.tr",
    trackingUrlTemplate: "https://kargotakip.mngkargo.com.tr/?takipNo={tracking}",
    apiPlanned: true,
  },
  {
    id: "PTT",
    label: "PTT Kargo",
    defaultName: "PTT Kargo",
    website: "https://gonderitakip.ptt.gov.tr",
    trackingUrlTemplate: "https://gonderitakip.ptt.gov.tr/Track/Verify?q={tracking}",
    apiPlanned: true,
  },
  {
    id: "SURAT",
    label: "Sürat Kargo",
    defaultName: "Sürat Kargo",
    website: "https://www.suratkargo.com.tr",
    trackingUrlTemplate: "https://www.suratkargo.com.tr/KargoTakip/?kargotakipno={tracking}",
    apiPlanned: true,
  },
  {
    id: "UPS",
    label: "UPS",
    defaultName: "UPS",
    website: "https://www.ups.com.tr",
    trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}",
    apiPlanned: true,
  },
  {
    id: "DHL",
    label: "DHL",
    defaultName: "DHL",
    website: "https://www.dhl.com/tr-tr",
    trackingUrlTemplate:
      "https://www.dhl.com/tr-tr/home/tracking.html?tracking-id={tracking}",
    apiPlanned: true,
  },
  {
    id: "FEDEX",
    label: "FedEx",
    defaultName: "FedEx",
    website: "https://www.fedex.com/tr-tr",
    trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking}",
    apiPlanned: true,
  },
  {
    id: "HOROZ",
    label: "Horoz Lojistik",
    defaultName: "Horoz Lojistik",
    website: "https://www.horoz.com.tr",
    trackingUrlTemplate: "",
    apiPlanned: true,
  },
  {
    id: "HEPSIJET",
    label: "HepsiJet",
    defaultName: "HepsiJet",
    website: "https://www.hepsijet.com",
    trackingUrlTemplate: "https://www.hepsijet.com/gonderi-takip?barcode={tracking}",
    apiPlanned: true,
  },
  {
    id: "TRENDYOL_EXPRESS",
    label: "Trendyol Express",
    defaultName: "Trendyol Express",
    website: "https://www.trendyol.com",
    trackingUrlTemplate: "",
    apiPlanned: true,
  },
  {
    id: "KOLAY_GELSIN",
    label: "Kolay Gelsin",
    defaultName: "Kolay Gelsin",
    website: "https://www.kolaygelsin.com",
    trackingUrlTemplate: "",
    apiPlanned: true,
  },
  {
    id: "SENDEO",
    label: "Sendeo",
    defaultName: "Sendeo",
    website: "https://www.sendeo.com.tr",
    trackingUrlTemplate: "https://www.sendeo.com.tr/gonderi-sorgula?code={tracking}",
    apiPlanned: true,
  },
];

export function isShippingCarrierProviderId(
  value: string,
): value is ShippingCarrierProviderId {
  return (SHIPPING_CARRIER_PROVIDER_IDS as readonly string[]).includes(value);
}

export function shippingCarrierProviderById(id: string): ShippingCarrierProviderMeta {
  return (
    SHIPPING_CARRIER_PROVIDERS.find((provider) => provider.id === id) ??
    SHIPPING_CARRIER_PROVIDERS[0]
  );
}

export function providerLabel(id: string): string {
  return shippingCarrierProviderById(id).label;
}
