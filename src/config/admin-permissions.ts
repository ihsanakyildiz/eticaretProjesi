export const PERMISSION_ACTIONS = ["view", "create", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionResource = {
  id: string;
  label: string;
  href: string;
  group: string;
  hint?: string;
};

export const ADMIN_PERMISSION_RESOURCES: PermissionResource[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", group: "Menü" },
  { id: "pages", label: "Sayfalar", href: "/admin/pages", group: "Menü" },
  { id: "heroes", label: "Hero", href: "/admin/heroes", group: "Menü" },
  { id: "cards", label: "Kartlar", href: "/admin/cards", group: "Menü" },
  { id: "pricing", label: "Fiyatlandırma", href: "/admin/pricing", group: "Menü" },
  { id: "faqs", label: "SSS", href: "/admin/faqs", group: "Menü" },
  { id: "menus", label: "Menüler", href: "/admin/menus", group: "Menü" },
  { id: "sidebars", label: "Sidebar", href: "/admin/sidebars", group: "Menü" },
  { id: "email", label: "E-posta", href: "/admin/email", group: "Menü" },
  { id: "products", label: "Ürün kataloğu", href: "/admin/products", group: "Mağaza" },
  { id: "campaigns", label: "Kampanyalar", href: "/admin/campaigns", group: "Mağaza" },
  { id: "product_categories", label: "Ürün kategorileri", href: "/admin/products/categories", group: "Mağaza" },
  { id: "brands", label: "Markalar", href: "/admin/products/brands", group: "Mağaza" },
  { id: "attributes", label: "Varyantlar", href: "/admin/products/attributes", group: "Mağaza" },
  { id: "filters", label: "Filtreler", href: "/admin/products/filters", group: "Mağaza" },
  { id: "suppliers", label: "Tedarikçiler", href: "/admin/products/suppliers", group: "Mağaza" },
  { id: "tax_rates", label: "KDV oranları", href: "/admin/products/tax-rates", group: "Mağaza" },
  { id: "shipping", label: "Kargo firmaları", href: "/admin/shipping", group: "Mağaza" },
  {
    id: "warehouse",
    label: "Depo kargo transfer",
    href: "/admin/warehouse",
    group: "Mağaza",
    hint: "Sipariş paketleme ve kargo çıkışı. Stok/raf için ayrı yetki gerekir.",
  },
  {
    id: "inventory",
    label: "Stok ve depolar",
    href: "/admin/inventory",
    group: "Mağaza",
    hint: "Ayarlar → Gelişmiş → Gelişmiş stok sistemi açıkken menüde görünür. Görme: stok ve raf. Ekleme: depo, raf, irsaliye. Düzenleme: raf ata ve belge onayla. Silme: boş raf ve taslak. Depo silme yalnız tam yönetici.",
  },
  { id: "customers", label: "Müşteriler", href: "/admin/members", group: "Mağaza" },
  { id: "orders", label: "Siparişler", href: "/admin/orders", group: "Mağaza" },
  { id: "reviews", label: "Ürün yorumları", href: "/admin/reviews", group: "Mağaza" },
  {
    id: "support",
    label: "Sohbet sayfası",
    href: "/admin/support",
    group: "Sohbet",
    hint: "Görme/yazma: gelen kutusu, yanıtlama, atama ve arşivleme. Silme: çöp kutusundan kalıcı silme ve çöpü boşaltma. Lisanslı sohbet modülü gerekir.",
  },
  { id: "works_categories", label: "İş kategorileri", href: "/admin/works/categories", group: "İçerik" },
  { id: "works", label: "Çalışmalar", href: "/admin/works", group: "İçerik" },
  { id: "project_categories", label: "Proje kategorileri", href: "/admin/projects/categories", group: "İçerik" },
  { id: "project_features", label: "Proje özellikleri", href: "/admin/projects/features", group: "İçerik" },
  { id: "project_clients", label: "Proje müşterileri", href: "/admin/projects/clients", group: "İçerik" },
  { id: "projects", label: "Projeler", href: "/admin/projects", group: "İçerik" },
  { id: "blog_categories", label: "Blog kategorileri", href: "/admin/blog/categories", group: "İçerik" },
  { id: "blog_posts", label: "Blog yazıları", href: "/admin/blog/posts", group: "İçerik" },
  { id: "settings", label: "Genel ayarlar", href: "/admin/settings", group: "Sistem" },
  { id: "settings_membership", label: "Müşteri hesapları", href: "/admin/settings/membership", group: "Sistem" },
  { id: "settings_payments", label: "Ödeme", href: "/admin/settings/payments", group: "Sistem" },
  { id: "settings_performance", label: "Performans", href: "/admin/settings/performance", group: "Sistem" },
  { id: "settings_search", label: "Arama motoru", href: "/admin/settings/search", group: "Sistem" },
  { id: "settings_ranking", label: "Ürün sıralaması", href: "/admin/settings/ranking", group: "Sistem" },
  { id: "settings_theme", label: "Tema tasarımı", href: "/admin/settings/theme", group: "Sistem" },
  { id: "settings_system", label: "Sistem sağlığı", href: "/admin/settings/system", group: "Sistem" },
  { id: "settings_languages", label: "Diller", href: "/admin/settings/languages", group: "Sistem" },
  { id: "settings_translations", label: "Çeviriler", href: "/admin/settings/translations", group: "Sistem" },
  {
    id: "settings_support",
    label: "Sohbet ayarları",
    href: "/admin/settings/support",
    group: "Sohbet",
    hint: "Lisans, kanallar, departmanlar, etiketler ve hazır yanıtlar.",
  },
  { id: "staff", label: "Personel", href: "/admin/staff", group: "Sistem" },
];

export type StaffPermissionFlags = {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type StaffPermissionMap = Record<string, StaffPermissionFlags>;

export const emptyPermissionFlags: StaffPermissionFlags = {
  view: false,
  create: false,
  update: false,
  delete: false,
};

export function emptyPermissionMap(): StaffPermissionMap {
  return Object.fromEntries(
    ADMIN_PERMISSION_RESOURCES.map((resource) => [resource.id, { ...emptyPermissionFlags }]),
  );
}

const resourcesByHref = [...ADMIN_PERMISSION_RESOURCES].sort(
  (left, right) => right.href.length - left.href.length,
);

export function resourceFromPath(pathname: string): string | null {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return null;
  if (pathname === "/admin/no-access" || pathname.startsWith("/admin/no-access/")) return null;
  const match = resourcesByHref.find((resource) => {
    if (resource.href === "/admin") return pathname === "/admin";
    return pathname === resource.href || pathname.startsWith(`${resource.href}/`);
  });
  return match?.id ?? null;
}

export const ADMIN_NO_ACCESS_HREF = "/admin/no-access";

export function firstViewableHref(
  map: StaffPermissionMap,
  isAdmin: boolean,
  skipResources: ReadonlySet<string> = new Set(),
): string {
  if (isAdmin) return "/admin";
  const found = ADMIN_PERMISSION_RESOURCES.find((resource) => {
    if (resource.id === "staff") return false;
    if (skipResources.has(resource.id)) return false;
    return map[resource.id]?.view;
  });
  return found?.href ?? ADMIN_NO_ACCESS_HREF;
}

export function hrefToResourceId(href: string): string | null {
  return ADMIN_PERMISSION_RESOURCES.find((resource) => resource.href === href)?.id ?? null;
}

export type AdminFeatureFlags = {
  advancedInventory: boolean;
  supportChat: boolean;
};

export function isInventoryNavHref(href: string) {
  return href === "/admin/inventory" || href.startsWith("/admin/inventory/");
}

export function isSupportNavHref(href: string) {
  return href === "/admin/support" || href.startsWith("/admin/support/");
}

export function filterNavByView<T extends { href?: string; children?: T[] }>(
  items: T[],
  role: string | undefined,
  map: StaffPermissionMap,
  features: AdminFeatureFlags = { advancedInventory: true, supportChat: false },
): T[] {
  return items
    .map((item) => {
      const children = item.children
        ? filterNavByView(item.children, role, map, features)
        : undefined;
      if (children && children.length > 0) {
        return { ...item, children };
      }
      if (item.href) {
        if (!features.advancedInventory && isInventoryNavHref(item.href)) return null;
        if (!features.supportChat && isSupportNavHref(item.href)) return null;
        const resource =
          ADMIN_PERMISSION_RESOURCES.find((entry) => entry.href === item.href)?.id ??
          resourceFromPath(item.href);
        if (resource && can(role, map, resource, "view")) return item;
      }
      return null;
    })
    .filter((item): item is T => item !== null);
}

function staffHasAction(
  map: StaffPermissionMap,
  resource: string,
  action: PermissionAction,
): boolean {
  const flags = map[resource];
  if (!flags) return false;
  switch (action) {
    case "view":
      return flags.view;
    case "create":
      return flags.create;
    case "update":
      return flags.update;
    case "delete":
      return flags.delete;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function can(
  role: string | undefined,
  map: StaffPermissionMap,
  resource: string,
  action: PermissionAction,
): boolean {
  if (role === "ADMIN") return true;
  if (role !== "STAFF") return false;
  if (resource === "staff") return false;
  if (staffHasAction(map, resource, action)) return true;
  if (resource === "warehouse") return staffHasAction(map, "orders", action);
  return false;
}
