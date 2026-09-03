import { cache } from "react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import {
  ADMIN_NO_ACCESS_HREF,
  ADMIN_PERMISSION_RESOURCES,
  can,
  emptyPermissionMap,
  firstViewableHref,
  resourceFromPath,
  type PermissionAction,
  type StaffPermissionFlags,
  type StaffPermissionMap,
} from "@/config/admin-permissions";
import { isAdvancedInventoryEnabled } from "@/lib/advanced-inventory";
import { prisma } from "@/lib/prisma";

export type { PermissionAction, StaffPermissionFlags, StaffPermissionMap };

export function isPanelRole(role: string | undefined): boolean {
  return role === Role.ADMIN || role === Role.STAFF;
}

export { can };

export async function getStaffPermissionMap(userId: string): Promise<StaffPermissionMap> {
  const map = emptyPermissionMap();
  const rows = await prisma.staffPermission.findMany({
    where: { userId },
  });
  for (const row of rows) {
    map[row.resource] = {
      view: row.canView,
      create: row.canCreate,
      update: row.canUpdate,
      delete: row.canDelete,
    };
  }
  return map;
}

export const getPanelAccess = cache(async () => {
  const session = await getAdminSession();
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!userId || !isPanelRole(role)) {
    return { session: null, role: undefined, map: emptyPermissionMap(), isAdmin: false };
  }
  if (role === Role.ADMIN) {
    return { session, role, map: emptyPermissionMap(), isAdmin: true };
  }
  const map = await getStaffPermissionMap(userId);
  return { session, role, map, isAdmin: false };
});

export async function requirePermission(resource: string, action: PermissionAction) {
  const access = await getPanelAccess();
  if (!access.session) {
    return { ok: false as const, error: "Oturum bulunamadı." };
  }
  if (resource === "inventory" && !(await isAdvancedInventoryEnabled())) {
    return {
      ok: false as const,
      error: "Gelişmiş stok sistemi kapalı. Ayarlar → Gelişmiş içinden açabilirsiniz.",
    };
  }
  if (!can(access.role, access.map, resource, action)) {
    return { ok: false as const, error: "Bu işlem için yetkiniz yok." };
  }
  return { ok: true as const, session: access.session, isAdmin: access.isAdmin };
}

export async function requireAdmin() {
  const access = await getPanelAccess();
  if (!access.session) {
    return { ok: false as const, error: "Oturum bulunamadı." };
  }
  if (!access.isAdmin) {
    return { ok: false as const, error: "Bu işlem yalnızca tam yöneticiye aittir." };
  }
  return { ok: true as const, session: access.session, isAdmin: true };
}

export async function requirePermissionOrThrow(resource: string, action: PermissionAction) {
  const result = await requirePermission(resource, action);
  if (!result.ok) throw new Error(result.error);
  return result.session;
}

export async function requirePageView(pathname: string) {
  const access = await getPanelAccess();
  if (!access.session) {
    redirect("/admin/login");
  }
  const advancedInventory = await isAdvancedInventoryEnabled();
  const withFeatures = { ...access, advancedInventory };
  const resource = resourceFromPath(pathname);
  if (resource === "inventory" && !advancedInventory) {
    redirect(firstViewableHref(access.map, access.isAdmin, new Set(["inventory"])));
  }
  if (!resource) return withFeatures;
  if (can(access.role, access.map, resource, "view")) return withFeatures;
  const destination = firstViewableHref(
    access.map,
    access.isAdmin,
    advancedInventory ? undefined : new Set(["inventory"]),
  );
  if (destination === pathname) {
    redirect(ADMIN_NO_ACCESS_HREF);
  }
  redirect(destination);
}

