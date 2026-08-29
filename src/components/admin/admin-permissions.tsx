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
};

const PermissionsContext = createContext<PermissionsContextValue>({
  role: "MEMBER",
  isAdmin: false,
  map: emptyPermissionMap(),
});

export function AdminPermissionsProvider({
  role,
  isAdmin,
  map,
  children,
}: PermissionsContextValue & { children: ReactNode }) {
  return (
    <PermissionsContext.Provider value={{ role, isAdmin, map }}>
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
