"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "./admin-header";
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
};

function AdminShellLayout({
  children,
  userName,
  userEmail,
  userRole,
  unreadNotificationCount,
}: Omit<AdminShellProps, "initialSidebarCollapsed">) {
  const { isCollapsed, isDesktop, allowTransition } = useSidebar();
  const iconMode = isDesktop && isCollapsed;

  return (
    <div
      data-admin-shell
      className="admin-shell min-h-screen bg-[#f3f6f9] text-slate-800"
    >
      <AdminSidebar />
      <div
        className={`admin-shell-main ${
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
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({
  initialSidebarCollapsed = false,
  ...props
}: AdminShellProps) {
  return (
    <AdminThemeProvider>
      <SidebarProvider initialCollapsed={initialSidebarCollapsed}>
        <AdminShellLayout {...props} />
      </SidebarProvider>
    </AdminThemeProvider>
  );
}
