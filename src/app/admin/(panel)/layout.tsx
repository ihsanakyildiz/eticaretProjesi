import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSidebarBootScript } from "@/components/admin/admin-sidebar-boot-script";
import { getAdminSession } from "@/lib/admin-session";
import {
  parseSidebarUiCookie,
  SIDEBAR_UI_COOKIE,
} from "@/lib/admin-sidebar-preference";
import { getUnreadMailNotificationCount } from "@/lib/mail-notifications";
import { can, isPanelRole, requirePageView } from "@/lib/staff-permissions";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  if (!session?.user?.id || !isPanelRole(session.user.role)) {
    redirect("/admin/login");
  }

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/admin";
  const access = await requirePageView(pathname);
  const unreadNotificationCount = can(access.role, access.map, "email", "view")
    ? await getUnreadMailNotificationCount()
    : 0;
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
        permissionRole={access.role ?? session.user.role}
        isAdmin={access.isAdmin}
        permissionMap={access.map}
      >
        {children}
      </AdminShell>
    </>
  );
}
