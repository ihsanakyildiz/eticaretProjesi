import {
  BookOpen,
  Briefcase,
  Building2,
  CircleDollarSign,
  CircleHelp,
  Columns3,
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
  Sparkles,
  Tags,
  HeartPulse,
  Palette,
  Users,
  UserCog,
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
        label: "Sayfalar",
        href: "/admin/pages",
        icon: FileText,
      },
      {
        label: "Hero",
        href: "/admin/heroes",
        icon: Images,
      },
      {
        label: "Kartlar",
        href: "/admin/cards",
        icon: LayoutGrid,
      },
      {
        label: "Fiyatlandırma",
        href: "/admin/pricing",
        icon: CircleDollarSign,
      },
      {
        label: "SSS",
        href: "/admin/faqs",
        icon: CircleHelp,
      },
      {
        label: "Menüler",
        href: "/admin/menus",
        icon: Menu,
      },
      {
        label: "Sidebar",
        href: "/admin/sidebars",
        icon: Columns3,
      },
      {
        label: "E-posta",
        href: "/admin/email",
        icon: Mail,
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
        label: "Üyeler",
        href: "/admin/members",
        icon: Users,
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
            label: "Üyelik",
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
