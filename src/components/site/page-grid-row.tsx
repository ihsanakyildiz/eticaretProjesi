import type { ReactNode } from "react";
import {
  getGridRowSettings,
  type PageSectionSettings,
} from "@/lib/page-sections";
import {
  gridColumnClassName,
  gridRowClassName,
} from "@/config/page-grid";
import type { ResolvedPageSection } from "@/lib/pages";
import { SectionHeading } from "@/components/site/section-heading";

export function PageGridRow({
  settings,
  title,
  subtitle,
  eyebrow,
  childrenByColumn,
}: {
  settings: PageSectionSettings;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  childrenByColumn: Map<string, ReactNode[]>;
}) {
  const config = getGridRowSettings(settings);
  const heading = (
    <SectionHeading
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      centered
      className="mb-8 sm:mb-10"
    />
  );

  const row = (
    <div className={gridRowClassName(config)}>
      {config.columns.map((column) => (
        <div key={column.id} className={gridColumnClassName(column.span)}>
          <div className="pg-nested pg-nested-root space-y-4">
            {(childrenByColumn.get(column.id) ?? []).length > 0 ? (
              childrenByColumn.get(column.id)
            ) : (
              <div className="min-h-[1px]" />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (config.useContainer) {
    return (
      <section className="py-8 sm:py-10">
        <div className="pg-container">
          {heading}
          {row}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {heading}
      {row}
    </section>
  );
}

export function groupGridChildren(
  children: ResolvedPageSection[],
  settings: PageSectionSettings,
): Map<string, ResolvedPageSection[]> {
  const config = getGridRowSettings(settings);
  const map = new Map<string, ResolvedPageSection[]>();
  for (const column of config.columns) {
    map.set(column.id, []);
  }
  const fallbackId = config.columns[0]?.id;

  for (const child of children) {
    const columnId = child.settings.gridCol?.columnId;
    const target =
      (columnId && map.has(columnId) ? columnId : null) ?? fallbackId;
    if (!target) continue;
    map.get(target)!.push(child);
  }

  return map;
}
