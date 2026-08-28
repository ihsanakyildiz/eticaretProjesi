/** Admin sidebar görünüm sabitleri ve localStorage / cookie yardımcıları */

export const SIDEBAR_DESKTOP_MIN = 1024;
export const SIDEBAR_AUTO_COLLAPSE_MAX = 1280;
export const SIDEBAR_MODE_STORAGE_KEY = "admin-sidebar-mode";
export const SIDEBAR_LEGACY_STORAGE_KEY = "admin-sidebar-collapsed";
export const SIDEBAR_UI_COOKIE = "admin-sidebar-ui";

export type SidebarMode = "auto" | "expanded" | "collapsed";
export type SidebarUi = "expanded" | "collapsed";

export function readStoredSidebarMode(): SidebarMode {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
    if (stored === "auto" || stored === "expanded" || stored === "collapsed") {
      return stored;
    }
    const legacy = localStorage.getItem(SIDEBAR_LEGACY_STORAGE_KEY);
    if (legacy === "1") return "collapsed";
    if (legacy === "0") return "expanded";
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeStoredSidebarMode(mode: SidebarMode) {
  try {
    localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function resolveSidebarCollapsed(mode: SidebarMode, width: number): boolean {
  if (width < SIDEBAR_DESKTOP_MIN) return false;
  if (mode === "collapsed") return true;
  if (mode === "expanded") return false;
  return width < SIDEBAR_AUTO_COLLAPSE_MAX;
}

export function writeSidebarUiCookie(collapsed: boolean) {
  if (typeof document === "undefined") return;
  const value: SidebarUi = collapsed ? "collapsed" : "expanded";
  document.cookie = `${SIDEBAR_UI_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applySidebarDataset(collapsed: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.adminSidebar = collapsed
    ? "collapsed"
    : "expanded";
  writeSidebarUiCookie(collapsed);
}

export function parseSidebarUiCookie(
  value: string | undefined | null,
): boolean {
  return value === "collapsed";
}

/** Boyamadan önce çalışacak inline script — FOUC / flicker önler */
export const ADMIN_SIDEBAR_BOOT_SCRIPT = `(function(){try{var D=${SIDEBAR_DESKTOP_MIN},A=${SIDEBAR_AUTO_COLLAPSE_MAX},w=window.innerWidth,m=localStorage.getItem("${SIDEBAR_MODE_STORAGE_KEY}");if(m!=="auto"&&m!=="expanded"&&m!=="collapsed"){var l=localStorage.getItem("${SIDEBAR_LEGACY_STORAGE_KEY}");m=l==="1"?"collapsed":l==="0"?"expanded":"auto";}var c=false;if(w>=D){if(m==="collapsed")c=true;else if(m==="expanded")c=false;else c=w<A;}var v=c?"collapsed":"expanded";document.documentElement.setAttribute("data-admin-sidebar",v);document.cookie="${SIDEBAR_UI_COOKIE}="+v+"; path=/; max-age=31536000; SameSite=Lax";}catch(e){document.documentElement.setAttribute("data-admin-sidebar","expanded");}})();`;
