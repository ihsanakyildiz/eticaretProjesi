"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  can,
  emptyPermissionMap,
  type PermissionAction,
  type StaffPermissionMap,
} from "@/config/admin-permissions";

type PermissionsContextValue = {
  role: string;
  isAdmin: boolean;
  map: StaffPermissionMap;
  advancedInventory: boolean;
  supportChat: boolean;
};

const PermissionsContext = createContext<PermissionsContextValue>({
  role: "MEMBER",
  isAdmin: false,
  map: emptyPermissionMap(),
  advancedInventory: false,
  supportChat: false,
});

export function AdminPermissionsProvider({
  role,
  isAdmin,
  map,
  advancedInventory,
  supportChat,
  children,
}: PermissionsContextValue & { children: ReactNode }) {
  return (
    <PermissionsContext.Provider
      value={{ role, isAdmin, map, advancedInventory, supportChat }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function useCan(resource: string, action: PermissionAction) {
  const { role, map } = usePermissions();
  return can(role, map, resource, action);
}

export function useCanWrite(resource: string) {
  const { role, map } = usePermissions();
  return can(role, map, resource, "update") || can(role, map, resource, "create");
}

export function Can({
  resource,
  action,
  children,
}: {
  resource: string;
  action: PermissionAction;
  children: ReactNode;
}) {
  if (!useCan(resource, action)) return null;
  return children;
}

export function useIsAdmin() {
  return usePermissions().isAdmin;
}

export function useAdvancedInventory() {
  return usePermissions().advancedInventory;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  if (!useIsAdmin()) return null;
  return children;
}
