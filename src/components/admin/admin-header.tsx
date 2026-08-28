"use client";

import { Menu, Moon, PanelLeft, PanelLeftClose, Search, Sun } from "lucide-react";
import { logoutAction } from "@/app/admin/(panel)/actions";
import { AdminNotifications } from "./admin-notifications";
import { useSidebar } from "./sidebar-context";
import { useAdminTheme } from "./theme-provider";

type AdminHeaderProps = {
  userName: string;
  userEmail: string;
  userRole: string;
  unreadNotificationCount: number;
};

export function AdminHeader({
  userName,
  userEmail,
  userRole,
  unreadNotificationCount,
}: AdminHeaderProps) {
  const { toggle, isCollapsed, toggleCollapsed } = useSidebar();
  const { isDark, toggleTheme } = useAdminTheme();

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="admin-surface sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[#e9ebec] bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-600 transition hover:bg-slate-50 lg:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={toggleCollapsed}
        className="hidden h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-600 transition hover:bg-slate-50 lg:inline-flex"
        aria-label={isCollapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
        title={isCollapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
      >
        {isCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Ara..."
          className="w-full rounded-md border border-[#e9ebec] bg-[#f3f6f9] py-2 pr-3 pl-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:bg-white focus:ring-2 focus:ring-[#0ab39c]/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50"
          aria-label={isDark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
          title={isDark ? "Aydınlık tema" : "Karanlık tema"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <AdminNotifications initialUnreadCount={unreadNotificationCount} />

        <div className="hidden h-8 w-px bg-[#e9ebec] sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700">{userName}</p>
            <p className="text-xs text-slate-400">{userRole}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#405189] text-xs font-semibold text-white">
            {initials}
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="hidden rounded-md border border-[#e9ebec] px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
          >
            Çıkış
          </button>
        </form>

        <span className="sr-only">{userEmail}</span>
      </div>
    </header>
  );
}
