import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSidebarBootScript } from "@/components/admin/admin-sidebar-boot-script";
import { getAdminSession } from "@/lib/admin-session";
import {
  parseSidebarUiCookie,
  SIDEBAR_UI_COOKIE,
} from "@/lib/admin-sidebar-preference";
import { isPanelRole, requirePageView } from "@/lib/staff-permissions";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, headerStore, cookieStore] = await Promise.all([
    getAdminSession(),
    headers(),
    cookies(),
  ]);

  if (!session?.user?.id || !isPanelRole(session.user.role)) {
    redirect("/admin/login");
  }

  const pathname = headerStore.get("x-pathname") ?? "/admin";
  const access = await requirePageView(pathname);
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
        unreadNotificationCount={0}
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
