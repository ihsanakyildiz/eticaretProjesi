import type { Metadata } from "next";
import { DashboardAnalytics } from "@/components/admin/dashboard/dashboard-analytics";
import { DashboardOverview } from "@/components/admin/dashboard/dashboard-overview";
import { DashboardPeriod } from "@/components/admin/dashboard/dashboard-period";
import { DashboardSales } from "@/components/admin/dashboard/dashboard-sales";
import { getDashboardData } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Gösterge paneli",
  description: "Mağaza satış ve sipariş özeti",
};

type Props = {
  searchParams: Promise<{ period?: string; from?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getDashboardData(params.period, params.from);

  return (
    <div className="space-y-6">
      <DashboardPeriod period={data.range.period} fromValue={data.range.fromValue} />

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <DashboardOverview activity={data.activity} />
        <DashboardSales orders={data.recent} topProducts={data.topProducts} />
      </div>

      <DashboardAnalytics metrics={data.metrics} chart={data.chart} />
    </div>
  );
}
