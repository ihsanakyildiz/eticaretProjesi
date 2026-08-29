import {
  BookOpen,
  Briefcase,
  Building2,
  CircleDollarSign,
  CircleHelp,
  Columns3,
  Award,
  Factory,
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
  Menu,
  PenLine,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  SwatchBook,
  Tags,
  HeartPulse,
  Palette,
  Percent,
  Truck,
  Users,
  UserCog,
  UserRoundCog,
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

export const adminNavFlatLinks = adminNavSections.flatMap((section) =>
  section.items.flatMap((item) => {
    const childLinks = (item.children ?? [])
      .map((child) => child.href)
      .filter((href): href is string => Boolean(href));

    return [...(item.href ? [item.href] : []), ...childLinks];
  }),
);
