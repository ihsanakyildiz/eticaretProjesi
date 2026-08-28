import { cache } from "react";
import type { SidebarLocation, SidebarPlacement } from "@prisma/client";
import { parseSidebarWidgetSettings } from "@/config/site-sidebars";
import { prisma } from "@/lib/prisma";

export type SiteSidebarWidgetView = {
  id: string;
  type:
    | "BLOG_CATEGORIES"
    | "WORK_CATEGORIES"
    | "PROJECT_CATEGORIES"
    | "CONTACT_INFO"
    | "RICH_TEXT"
    | "IMAGE";
  title: string | null;
  content: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  settings: ReturnType<typeof parseSidebarWidgetSettings>;
};

export type SiteSidebarView = {
  id: string;
  name: string;
  slug: string;
  location: SidebarLocation | null;
  placement: SidebarPlacement;
  widgets: SiteSidebarWidgetView[];
};

export const getSidebarByLocation = cache(
  async (location: SidebarLocation): Promise<SiteSidebarView | null> => {
    const row = await prisma.siteSidebar.findFirst({
      where: { location, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        widgets: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!row || row.widgets.length === 0) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      location: row.location,
      placement: row.placement,
      widgets: row.widgets.map((widget) => ({
        id: widget.id,
        type: widget.type,
        title: widget.title,
        content: widget.content,
        imagePath: widget.imagePath,
        imageAlt: widget.imageAlt,
        settings: parseSidebarWidgetSettings(widget.settings),
      })),
    };
  },
);
