import { SiteLink } from "@/components/site/site-link";
import { WORK_CATEGORY_PATH, workCategoryHref } from "@/lib/works";

export type WorkSidebarCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  workCount: number;
};

export function WorkCategorySidebar({
  categories,
  activeSlug = null,
  title = "Kategoriler",
  showCounts = true,
  showAllLink = true,
  embedded = false,
}: {
  categories: WorkSidebarCategory[];
  activeSlug?: string | null;
  title?: string;
  showCounts?: boolean;
  showAllLink?: boolean;
  embedded?: boolean;
}) {
  const roots = categories.filter(
    (category) =>
      !category.parentId ||
      !categories.some((item) => item.id === category.parentId),
  );
  const items = roots.length > 0 ? roots : categories;

  if (categories.length === 0) return null;

  const card = (
    <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-site-fg">
        {title}
      </h2>
      <ul className="mt-3 space-y-1">
        <li>
          <SiteLink
            href="/yapilan-isler"
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
              !activeSlug
                ? "bg-site-primary-soft font-semibold text-site-primary"
                : "text-site-fg hover:bg-site-surface"
            }`}
          >
            Tüm çalışmalar
          </SiteLink>
        </li>
        {items.map((category) => (
          <CategoryBranch
            key={category.id}
            category={category}
            categories={categories}
            activeSlug={activeSlug}
            depth={0}
            showCounts={showCounts}
          />
        ))}
      </ul>
      {showAllLink ? (
        <SiteLink
          href={WORK_CATEGORY_PATH}
          className="mt-4 inline-flex text-sm font-semibold text-site-primary hover:underline"
        >
          Tüm kategoriler
        </SiteLink>
      ) : null}
    </div>
  );

  if (embedded) return card;

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">{card}</aside>
  );
}

function CategoryBranch({
  category,
  categories,
  activeSlug,
  depth,
  showCounts,
}: {
  category: WorkSidebarCategory;
  categories: WorkSidebarCategory[];
  activeSlug: string | null;
  depth: number;
  showCounts: boolean;
}) {
  const children = categories.filter((item) => item.parentId === category.id);
  const active = activeSlug === category.slug;

  return (
    <li>
      <SiteLink
        href={workCategoryHref(category.slug)}
        className={`flex items-center justify-between rounded-xl py-2.5 pr-3 text-sm transition ${
          depth > 0 ? "pl-6" : "pl-3"
        } ${
          active
            ? "bg-site-primary-soft font-semibold text-site-primary"
            : "text-site-fg hover:bg-site-surface"
        }`}
      >
        <span className="truncate">{category.name}</span>
        {showCounts ? (
          <span className="ml-2 shrink-0 text-xs text-site-muted">
            {category.workCount}
          </span>
        ) : null}
      </SiteLink>
      {children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <CategoryBranch
              key={child.id}
              category={child}
              categories={categories}
              activeSlug={activeSlug}
              depth={depth + 1}
              showCounts={showCounts}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
