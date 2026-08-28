import type { Metadata } from "next";
import { DashboardActivity } from "@/components/admin/dashboard/dashboard-activity";
import { DashboardCategories } from "@/components/admin/dashboard/dashboard-categories";
import { DashboardChart } from "@/components/admin/dashboard/dashboard-chart";
import { DashboardModules } from "@/components/admin/dashboard/dashboard-modules";
import { DashboardStats } from "@/components/admin/dashboard/dashboard-stats";
import { DashboardWelcome } from "@/components/admin/dashboard/dashboard-welcome";
import { getAdminSession } from "@/lib/admin-session";
import { getDashboardData } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Yönetim paneli ana sayfa",
};

export default async function AdminDashboardPage() {
  const [session, data] = await Promise.all([
    getAdminSession(),
    getDashboardData(),
  ]);
  const userName = session?.user?.name ?? "Admin";

  return (
    <div className="space-y-6">
      <DashboardWelcome
        userName={userName}
        contentTotal={data.totals.content}
        activeTotal={data.totals.active}
        quickActions={data.quickActions}
      />

      <DashboardStats stats={data.stats} />

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardChart items={data.distribution} />
        <DashboardCategories categories={data.categories} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardActivity items={data.activity} />
        <DashboardModules modules={data.modules} />
      </div>
    </div>
  );
}
