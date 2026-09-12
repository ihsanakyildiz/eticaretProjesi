export type CampaignStatsSummary = {
  campaignId: string;
  revenueMinor: number;
  unitsSold: number;
  orderCount: number;
  cartUnits: number;
};

export type CampaignStatsPoint = {
  label: string;
  fullLabel: string;
  revenueMinor: number;
  units: number;
};

export type CampaignStatsProduct = {
  id: string;
  title: string;
  image: string | null;
  quantity: number;
  revenueMinor: number;
};

export type CampaignStatsCartProduct = {
  id: string;
  variantId: string | null;
  title: string;
  variantTitle: string | null;
  image: string | null;
  quantity: number;
  sessions: number;
  valueMinor: number;
  lastUpdatedAt: string | null;
};

export type CampaignStatsDetail = {
  campaignId: string;
  name: string;
  offerLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  productCount: number;
  revenueMinor: number;
  unitsSold: number;
  orderCount: number;
  uniqueProductsSold: number;
  discountMinor: number;
  averageOrderMinor: number;
  pendingOrderCount: number;
  pendingUnits: number;
  pendingMinor: number;
  cartUnits: number;
  cartSessions: number;
  cartValueMinor: number;
  daily: CampaignStatsPoint[];
  topProducts: CampaignStatsProduct[];
  cartProducts: CampaignStatsCartProduct[];
};
