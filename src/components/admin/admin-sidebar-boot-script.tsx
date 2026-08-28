import { ADMIN_SIDEBAR_BOOT_SCRIPT } from "@/lib/admin-sidebar-preference";

/** Boyamadan önce sidebar açık/kapalı tercihini html'e yazar */
export function AdminSidebarBootScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: ADMIN_SIDEBAR_BOOT_SCRIPT }}
    />
  );
}
