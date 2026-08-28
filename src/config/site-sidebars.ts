import type {
  SidebarLocation,
  SidebarPlacement,
  SidebarWidgetType,
} from "@prisma/client";
import {
  getDefaultContactInfoBlockConfig,
  parseContactInfoBlockConfig,
  type ContactInfoBlockConfig,
} from "@/config/contact-info-block";

export type SidebarLocationMeta = {
  key: SidebarLocation;
  label: string;
  description: string;
};

export const SIDEBAR_LOCATIONS: SidebarLocationMeta[] = [
  {
    key: "BLOG_LIST",
    label: "Blog listesi",
    description: "Blog ana sayfası kenar çubuğu",
  },
  {
    key: "BLOG_DETAIL",
    label: "Blog yazı detayı",
    description: "Tekil blog yazısı sayfası kenar çubuğu",
  },
  {
    key: "WORKS_LIST",
    label: "Yapılan işler listesi",
    description: "Yapılan işler ana sayfası kenar çubuğu",
  },
  {
    key: "WORKS_DETAIL",
    label: "Yapılan iş detayı",
    description: "Tekil yapılan iş sayfası kenar çubuğu",
  },
  {
    key: "PROJECTS_LIST",
    label: "Projeler listesi",
    description: "Projeler ana sayfası kenar çubuğu",
  },
  {
    key: "PROJECTS_DETAIL",
    label: "Proje detayı",
    description: "Tekil proje sayfası kenar çubuğu",
  },
  {
    key: "PAGE_DETAIL",
    label: "Sayfalar",
    description: "Klasik ve gelişmiş CMS sayfaları kenar çubuğu",
  },
];

export type SidebarPlacementMeta = {
  key: SidebarPlacement;
  label: string;
  description: string;
};

export const SIDEBAR_PLACEMENTS: SidebarPlacementMeta[] = [
  {
    key: "LEFT",
    label: "Sol",
    description: "İçeriğin solunda görünür",
  },
  {
    key: "RIGHT",
    label: "Sağ",
    description: "İçeriğin sağında görünür",
  },
];

export type SidebarWidgetTypeMeta = {
  key: SidebarWidgetType;
  label: string;
  description: string;
};

export const SIDEBAR_WIDGET_TYPES: SidebarWidgetTypeMeta[] = [
  {
    key: "BLOG_CATEGORIES",
    label: "Blog kategorileri",
    description: "Blog kategori listesini gösterir",
  },
  {
    key: "WORK_CATEGORIES",
    label: "Yapılan iş kategorileri",
    description: "Yapılan işler kategori listesini gösterir",
  },
  {
    key: "PROJECT_CATEGORIES",
    label: "Proje kategorileri",
    description: "Proje kategori listesini gösterir",
  },
  {
    key: "CONTACT_INFO",
    label: "İletişim bilgileri",
    description: "Ayarlardaki e-posta, telefon, adres vb.",
  },
  {
    key: "RICH_TEXT",
    label: "Metin / HTML",
    description: "Zengin metin editörü ile serbest içerik",
  },
  {
    key: "IMAGE",
    label: "Görsel",
    description: "Tek görsel (isteğe bağlı link)",
  },
];

export function getSidebarLocationLabel(key: SidebarLocation | null | undefined) {
  if (!key) return "Konum atanmadı";
  return SIDEBAR_LOCATIONS.find((item) => item.key === key)?.label ?? key;
}

export function getSidebarPlacementLabel(
  key: SidebarPlacement | null | undefined,
) {
  if (!key) return "Sol";
  return SIDEBAR_PLACEMENTS.find((item) => item.key === key)?.label ?? key;
}

export function getSidebarWidgetTypeLabel(key: SidebarWidgetType) {
  return SIDEBAR_WIDGET_TYPES.find((item) => item.key === key)?.label ?? key;
}

export type SidebarWidgetSettings = {
  showCounts?: boolean;
  showAllLink?: boolean;
  imageLinkUrl?: string;
  contact?: ContactInfoBlockConfig;
};

export function parseSidebarWidgetSettings(
  raw: string | null | undefined,
): SidebarWidgetSettings {
  if (!raw) {
    return {
      showCounts: true,
      showAllLink: true,
      contact: getDefaultContactInfoBlockConfig(),
    };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      showCounts:
        typeof parsed.showCounts === "boolean" ? parsed.showCounts : true,
      showAllLink:
        typeof parsed.showAllLink === "boolean" ? parsed.showAllLink : true,
      imageLinkUrl:
        typeof parsed.imageLinkUrl === "string"
          ? parsed.imageLinkUrl.trim().slice(0, 500)
          : undefined,
      contact:
        parseContactInfoBlockConfig(parsed.contact) ??
        getDefaultContactInfoBlockConfig(),
    };
  } catch {
    return {
      showCounts: true,
      showAllLink: true,
      contact: getDefaultContactInfoBlockConfig(),
    };
  }
}

export function stringifySidebarWidgetSettings(
  settings: SidebarWidgetSettings,
): string {
  return JSON.stringify(settings);
}
