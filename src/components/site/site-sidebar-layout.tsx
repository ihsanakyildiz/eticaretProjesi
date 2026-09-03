import type { ReactNode } from "react";
import type { SidebarLocation, SidebarPlacement } from "@prisma/client";
import {
  getSidebarByLocation,
  type SiteSidebarView,
} from "@/lib/site-sidebars";
import { SiteSidebarRenderer } from "@/components/site/site-sidebar-slot";

export function SiteSidebarLayout({
  placement = "LEFT",
  sidebar,
  children,
  className = "",
  compactSidebar = false,
}: {
  placement?: SidebarPlacement;
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
  compactSidebar?: boolean;
}) {
  if (!sidebar) {
    return (
      <div
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`.trim()}
      >
        {children}
      </div>
    );
  }

  const isRight = placement === "RIGHT";
  const gridCols = compactSidebar
    ? isRight
      ? "lg:grid-cols-[minmax(0,1fr)_13.5rem]"
      : "lg:grid-cols-[13.5rem_minmax(0,1fr)]"
    : isRight
      ? "lg:grid-cols-[minmax(0,1fr)_280px]"
      : "lg:grid-cols-[280px_minmax(0,1fr)]";
  const gap = compactSidebar ? "gap-6 lg:gap-8" : "gap-10 lg:gap-12";

  return (
    <div
      className={`mx-auto grid max-w-7xl px-4 sm:px-6 lg:px-8 ${gap} ${gridCols} ${className}`.trim()}
    >
      {isRight ? (
        <>
          <div className="min-w-0">{children}</div>
          {sidebar}
        </>
      ) : (
        <>
          {sidebar}
          <div className="min-w-0">{children}</div>
        </>
      )}
    </div>
  );
}

/**
 * Konuma göre CMS veya fallback sidebar’ı çözer; sol/sağ yerleşimi uygular.
 */
export async function SiteSidebarPageLayout({
  location,
  fallbackSidebar = null,
  fallbackPlacement = "LEFT",
  activeSlug = null,
  children,
  className = "",
}: {
  location: SidebarLocation;
  fallbackSidebar?: ReactNode;
  fallbackPlacement?: SidebarPlacement;
  activeSlug?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const cms = await getSidebarByLocation(location);
  const sidebar = cms ? (
    <SiteSidebarRenderer sidebar={cms} activeSlug={activeSlug} />
  ) : (
    fallbackSidebar
  );
  const placement = cms?.placement ?? fallbackPlacement;

  return (
    <SiteSidebarLayout
      placement={placement}
      sidebar={sidebar}
      className={className}
    >
      {children}
    </SiteSidebarLayout>
  );
}

export type { SiteSidebarView };
