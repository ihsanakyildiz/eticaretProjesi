import {
  ADMIN_PERMISSION_RESOURCES,
  emptyPermissionMap,
  type StaffPermissionFlags,
  type StaffPermissionMap,
} from "@/config/admin-permissions";

export type PermissionGrant = "none" | "view" | "write" | "full";

export type PermissionPresetId = "manager" | "editor" | "support" | "store";

export type PermissionPreset = {
  id: PermissionPresetId;
  label: string;
  description: string;
};

const GRANT_FLAGS: Record<PermissionGrant, StaffPermissionFlags> = {
  none: { view: false, create: false, update: false, delete: false },
  view: { view: true, create: false, update: false, delete: false },
  write: { view: true, create: true, update: true, delete: false },
  full: { view: true, create: true, update: true, delete: true },
};

const MENU_CONTENT_IDS = [
  "pages",
  "heroes",
  "cards",
  "pricing",
  "faqs",
  "menus",
  "sidebars",
  "works_categories",
  "works",
  "project_categories",
  "project_features",
  "project_clients",
  "projects",
  "blog_categories",
  "blog_posts",
] as const;

const STORE_IDS = [
  "products",
  "product_categories",
  "brands",
  "attributes",
  "filters",
  "suppliers",
  "tax_rates",
  "shipping",
  "customers",
  "orders",
] as const;

function grantMap(
  grants: Partial<Record<string, PermissionGrant>> & { "*": PermissionGrant },
): StaffPermissionMap {
  const map = emptyPermissionMap();
  for (const resource of ADMIN_PERMISSION_RESOURCES) {
    if (resource.id === "staff") {
      map[resource.id] = { ...GRANT_FLAGS.none };
      continue;
    }
    const grant = grants[resource.id] ?? grants["*"];
    map[resource.id] = { ...GRANT_FLAGS[grant] };
  }
  return map;
}

function grantsForIds(
  ids: readonly string[],
  grant: PermissionGrant,
  extra: Partial<Record<string, PermissionGrant>> = {},
): Partial<Record<string, PermissionGrant>> & { "*": PermissionGrant } {
  const grants: Partial<Record<string, PermissionGrant>> & { "*": PermissionGrant } = {
    "*": "none",
    ...extra,
  };
  for (const id of ids) {
    grants[id] = grant;
  }
  return grants;
}

export const STAFF_PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: "manager",
    label: "Yönetici",
    description: "Personel hariç tüm sayfalarda tam yetki",
  },
  {
    id: "editor",
    label: "Editör",
    description: "Site ve içerik sayfalarını yönetir; mağaza ve ayarlar kapalı",
  },
  {
    id: "support",
    label: "Müşteri temsilcisi",
    description: "Sipariş, müşteri ve e-posta; silme yok",
  },
  {
    id: "store",
    label: "Mağaza sorumlusu",
    description: "Ürün, sipariş ve müşteri işlemleri",
  },
];

export function permissionMapForPreset(presetId: PermissionPresetId): StaffPermissionMap {
  switch (presetId) {
    case "manager":
      return grantMap({ "*": "full" });
    case "editor":
      return grantMap(grantsForIds(MENU_CONTENT_IDS, "full", { dashboard: "view" }));
    case "support":
      return grantMap({
        "*": "none",
        dashboard: "view",
        email: "write",
        customers: "write",
        orders: "write",
        products: "view",
      });
    case "store":
      return grantMap(
        grantsForIds(STORE_IDS, "full", {
          dashboard: "view",
          email: "write",
        }),
      );
    default: {
      const _exhaustive: never = presetId;
      return _exhaustive;
    }
  }
}

export function mapsMatch(left: StaffPermissionMap, right: StaffPermissionMap): boolean {
  return ADMIN_PERMISSION_RESOURCES.every((resource) => {
    const a = left[resource.id];
    const b = right[resource.id];
    return (
      a?.view === b?.view &&
      a?.create === b?.create &&
      a?.update === b?.update &&
      a?.delete === b?.delete
    );
  });
}

export function matchingPresetId(map: StaffPermissionMap): PermissionPresetId | null {
  for (const preset of STAFF_PERMISSION_PRESETS) {
    if (mapsMatch(map, permissionMapForPreset(preset.id))) return preset.id;
  }
  return null;
}
