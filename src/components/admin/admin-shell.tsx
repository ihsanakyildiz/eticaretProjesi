"use client";

import type { ReactNode } from "react";
import type { StaffPermissionMap } from "@/config/admin-permissions";
import { AdminHeader } from "./admin-header";
import { AdminPermissionsProvider } from "./admin-permissions";
import { AdminSidebar } from "./admin-sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { AdminThemeProvider } from "./theme-provider";

type AdminShellProps = {
  children: ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  unreadNotificationCount: number;
  initialSidebarCollapsed?: boolean;
  permissionRole: string;
  isAdmin: boolean;
  permissionMap: StaffPermissionMap;
  advancedInventory: boolean;
  supportChat: boolean;
};

function AdminShellLayout({
  children,
  userName,
  userEmail,
  userRole,
  unreadNotificationCount,
}: Omit<
    AdminShellProps,
    | "initialSidebarCollapsed"
    | "permissionRole"
    | "isAdmin"
    | "permissionMap"
    | "advancedInventory"
    | "supportChat"
  >) {
  const { isCollapsed, isDesktop, allowTransition } = useSidebar();
  const iconMode = isDesktop && isCollapsed;

  return (
    <div
      data-admin-shell
      className="admin-shell min-h-screen bg-[#f3f6f9] text-slate-800"
    >
      <AdminSidebar />
      <div
        className={`admin-shell-main print:pl-0 ${
          allowTransition
            ? "transition-[padding] duration-300 ease-out"
            : "transition-none"
        } ${iconMode ? "lg:pl-[72px]" : "lg:pl-[260px]"}`}
        suppressHydrationWarning
      >
        <AdminHeader
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="p-4 print:p-0 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({
  initialSidebarCollapsed = false,
  permissionRole,
  isAdmin,
  permissionMap,
  advancedInventory,
  supportChat,
  ...props
}: AdminShellProps) {
  return (
    <AdminThemeProvider>
      <AdminPermissionsProvider
        role={permissionRole}
        isAdmin={isAdmin}
        map={permissionMap}
        advancedInventory={advancedInventory}
        supportChat={supportChat}
      >
        <SidebarProvider initialCollapsed={initialSidebarCollapsed}>
          <AdminShellLayout {...props} />
        </SidebarProvider>
      </AdminPermissionsProvider>
    </AdminThemeProvider>
  );
}
