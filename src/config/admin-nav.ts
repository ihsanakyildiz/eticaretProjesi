import {
  BookOpen,
  Briefcase,
  Building2,
  CreditCard,
  CircleDollarSign,
  CircleHelp,
  Columns3,
  Award,
  Factory,
  FileSpreadsheet,
  FileInput,
  FileOutput,
  FileText,
  FolderKanban,
  Gauge,
  Globe,
  Images,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Mail,
  MapPin,
  Menu,
  ArrowLeftRight,
  ClipboardList,
  Boxes,
  PenLine,
  Rss,
  Settings,
  ShoppingBag,
  ScanBarcode,
  SlidersHorizontal,
  Sparkles,
  SwatchBook,
  Tags,
  HeartPulse,
  Palette,
  Percent,
  Truck,
  Upload,
  Users,
  UserCog,
  UserRoundCog,
  Warehouse,
  Webhook,
  Star,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  children?: AdminNavItem[];
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Menü",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Tasarım",
        icon: Palette,
        children: [
          { label: "Sayfalar", href: "/admin/pages", icon: FileText },
          { label: "Hero", href: "/admin/heroes", icon: Images },
          { label: "Kartlar", href: "/admin/cards", icon: LayoutGrid },
          { label: "Fiyatlandırma", href: "/admin/pricing", icon: CircleDollarSign },
          { label: "SSS", href: "/admin/faqs", icon: CircleHelp },
          { label: "Menüler", href: "/admin/menus", icon: Menu },
          { label: "Sidebar", href: "/admin/sidebars", icon: Columns3 },
        ],
      },
      {
        label: "E-posta",
        href: "/admin/email",
        icon: Mail,
      },
    ],
  },
  {
    title: "Mağaza",
    items: [
      {
        label: "Ürünler",
        icon: ShoppingBag,
        children: [
          { label: "Katalog", href: "/admin/products", icon: LayoutGrid },
          { label: "Tekrarlayan barkodlar", href: "/admin/products/duplicate-barcodes", icon: ScanBarcode },
          {
            label: "Ürün yükle",
            icon: Upload,
            children: [
              { label: "Genel bakış", href: "/admin/products/import", icon: Upload },
              { label: "Excel", href: "/admin/products/import/excel", icon: FileSpreadsheet },
              { label: "XML kaynakları", href: "/admin/products/import/xml", icon: Rss },
              { label: "API kaynakları", href: "/admin/products/import/api", icon: Webhook },
            ],
          },
          { label: "Kategoriler", href: "/admin/products/categories", icon: Tags },
          { label: "Markalar", href: "/admin/products/brands", icon: Award },
          { label: "Varyantlar", href: "/admin/products/attributes", icon: SwatchBook },
          { label: "Filtreler", href: "/admin/products/filters", icon: SlidersHorizontal },
          { label: "Tedarikçiler", href: "/admin/products/suppliers", icon: Factory },
          { label: "KDV Oranları", href: "/admin/products/tax-rates", icon: Percent },
        ],
      },
      {
        label: "Müşteriler",
        href: "/admin/members",
        icon: Users,
      },
      {
        label: "Siparişler",
        href: "/admin/orders",
        icon: ShoppingBag,
      },
      {
        label: "Ürün yorumları",
        href: "/admin/reviews",
        icon: Star,
      },
      {
        label: "Depo kargo transfer",
        href: "/admin/warehouse",
        icon: Warehouse,
      },
      {
        label: "Stok ve depolar",
        icon: Boxes,
        children: [
          { label: "Stok durumu", href: "/admin/inventory", icon: ClipboardList },
          { label: "Depolar", href: "/admin/inventory/warehouses", icon: Warehouse },
          { label: "Raflar", href: "/admin/inventory/locations", icon: MapPin },
          { label: "El terminali", href: "/admin/inventory/scan", icon: ScanBarcode },
          { label: "Giriş irsaliyesi", href: "/admin/inventory/receipts", icon: FileInput },
          { label: "Alış faturası", href: "/admin/inventory/invoices", icon: FileText },
          { label: "Çıkış irsaliyesi", href: "/admin/inventory/issues", icon: FileOutput },
          { label: "Transfer", href: "/admin/inventory/transfers", icon: ArrowLeftRight },
          { label: "Sayım", href: "/admin/inventory/counts", icon: ClipboardList },
          { label: "Düzeltme", href: "/admin/inventory/adjustments", icon: SlidersHorizontal },
          { label: "Tedarikçi iadesi", href: "/admin/inventory/supplier-returns", icon: FileOutput },
          { label: "Müşteri iadesi", href: "/admin/inventory/customer-returns", icon: FileInput },
          { label: "Hareketler", href: "/admin/inventory/movements", icon: Layers },
        ],
      },
      {
        label: "Kargo firmaları",
        href: "/admin/shipping",
        icon: Truck,
      },
    ],
  },
  {
    title: "İçerik",
    items: [
      {
        label: "Yapılan İşler",
        icon: Briefcase,
        children: [
          { label: "Kategoriler", href: "/admin/works/categories", icon: Tags },
          { label: "Çalışmalar", href: "/admin/works", icon: Layers },
        ],
      },
      {
        label: "Projeler",
        icon: FolderKanban,
        children: [
          { label: "Kategoriler", href: "/admin/projects/categories", icon: Tags },
          { label: "Özellikler", href: "/admin/projects/features", icon: Sparkles },
          { label: "Müşteriler", href: "/admin/projects/clients", icon: Building2 },
          { label: "Projeler", href: "/admin/projects", icon: Briefcase },
        ],
      },
      {
        label: "Blog",
        icon: BookOpen,
        children: [
          { label: "Kategoriler", href: "/admin/blog/categories", icon: Tags },
          { label: "Yazılar", href: "/admin/blog/posts", icon: PenLine },
        ],
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        label: "Personel",
        href: "/admin/staff",
        icon: UserRoundCog,
      },
      {
        label: "Ayarlar",
        icon: Settings,
        children: [
          {
            label: "Genel Ayarlar",
            href: "/admin/settings",
            icon: Settings,
          },
          {
            label: "Müşteri hesapları",
            href: "/admin/settings/membership",
            icon: UserCog,
          },
          {
            label: "Ödeme",
            href: "/admin/settings/payments",
            icon: CreditCard,
          },
          {
            label: "Performans",
            href: "/admin/settings/performance",
            icon: Gauge,
          },
          {
            label: "Tema Tasarımı",
            href: "/admin/settings/theme",
            icon: Palette,
          },
          {
            label: "Sistem Sağlığı",
            href: "/admin/settings/system",
            icon: HeartPulse,
          },
          {
            label: "Diller",
            href: "/admin/settings/languages",
            icon: Globe,
          },
          {
            label: "Çeviriler",
            href: "/admin/settings/translations",
            icon: Languages,
          },
        ],
      },
    ],
  },
];

function collectNavHrefs(items: AdminNavItem[]): string[] {
  return items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...collectNavHrefs(item.children ?? []),
  ]);
}

export const adminNavFlatLinks = collectNavHrefs(
  adminNavSections.flatMap((section) => section.items),
);
