import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/site/json-ld";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { getCachedWorkCategoryIndex, workCategoryHref } from "@/lib/works";
import { stripHtml } from "@/lib/html";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, PUBLIC_HUB_SEO } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  return buildPublicMetadata({
    settings,
    ...PUBLIC_HUB_SEO.workCategories,
  });
}

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export default async function WorkCategoriesIndexPage() {
  const [categories, settings] = await Promise.all([
    getCachedWorkCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const perf = parsePerformance(settings);
  const roots = categories.filter(
    (category) =>
      !category.parentId ||
      !categories.some((item) => item.id === category.parentId),
  );
  const items = roots.length > 0 ? roots : categories;
  const hub = PUBLIC_HUB_SEO.workCategories;

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: hub.title,
          description: hub.description,
          path: hub.path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: "Yapılan İşler", path: "/yapilan-isler" },
            { name: hub.title, path: hub.path },
          ],
        })}
      />
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <nav className="text-sm text-site-primary">
            <SiteLink href="/" className="hover:underline">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href="/yapilan-isler" className="hover:underline">
              Yapılan İşler
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">Kategoriler</span>
          </nav>
          <span className="mt-4 inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            Portföy
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            İş Kategorileri
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-site-muted">
            Hizmet alanlarımıza göre tamamladığımız çalışmaları keşfedin.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-site-muted">
              Henüz yayınlanmış kategori yok.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((category, index) => {
                const image = withCdnUrl(category.image, perf.cdnUrl);
                return (
                  <SiteLink
                    key={category.id}
                    href={workCategoryHref(category.slug)}
                    className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                      {image ? (
                        <SiteImage
                          src={image}
                          alt={category.name}
                          fill
                          priority={index === 0}
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
                        {category.workCount} çalışma
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold text-site-fg group-hover:text-site-primary">
                        {category.name}
                      </h2>
                      {category.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-site-muted">
                          {stripHtml(category.description)}
                        </p>
                      ) : null}
                    </div>
                  </SiteLink>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <HomeCta />
    </>
  );
}
