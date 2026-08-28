import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSidebarBootScript } from "@/components/admin/admin-sidebar-boot-script";
import { getAdminSession } from "@/lib/admin-session";
import {
  parseSidebarUiCookie,
  SIDEBAR_UI_COOKIE,
} from "@/lib/admin-sidebar-preference";
import { getUnreadMailNotificationCount } from "@/lib/mail-notifications";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect("/admin/login");
  }

  const unreadNotificationCount = await getUnreadMailNotificationCount();
  const cookieStore = await cookies();
  const initialSidebarCollapsed = parseSidebarUiCookie(
    cookieStore.get(SIDEBAR_UI_COOKIE)?.value,
  );

  return (
    <>
      <AdminSidebarBootScript />
      <AdminShell
        userName={session.user.name ?? "Admin"}
        userEmail={session.user.email ?? ""}
        userRole={session.user.role}
        unreadNotificationCount={unreadNotificationCount}
        initialSidebarCollapsed={initialSidebarCollapsed}
      >
        {children}
      </AdminShell>
    </>
  );
}
