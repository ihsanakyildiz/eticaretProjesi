import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/site/json-ld";
import { SiteLink } from "@/components/site/site-link";
import { LucideIconByName } from "@/lib/lucide-icons";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { getCachedProjectTagIndex, projectTagHref } from "@/lib/projects";
import { buildPublicMetadata, PUBLIC_HUB_SEO } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  return buildPublicMetadata({
    settings,
    ...PUBLIC_HUB_SEO.projectTags,
  });
}

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export default async function ProjectTagsIndexPage() {
  const [tags, settings] = await Promise.all([
    getCachedProjectTagIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const hub = PUBLIC_HUB_SEO.projectTags;

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
            { name: "Projeler", path: "/projeler" },
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
            <SiteLink href="/projeler" className="hover:underline">
              Projeler
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">Etiketler</span>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            Proje Etiketleri
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-site-muted">
            Teknoloji ve yetkinlik etiketlerine göre tamamladığımız çalışmaları keşfedin.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {tags.length === 0 ? (
            <p className="py-16 text-center text-sm text-site-muted">
              Henüz etiketlenmiş proje yok.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => (
                <SiteLink
                  key={tag.id}
                  href={projectTagHref(tag.slug)}
                  className="group flex items-start gap-4 rounded-3xl border border-site-border bg-site-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-xl"
                >
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-site-primary-soft"
                    style={{ color: tag.iconColor || undefined }}
                  >
                    <LucideIconByName
                      name={tag.icon ?? "Sparkles"}
                      className={`h-5 w-5 ${tag.iconColor ? "" : "text-site-primary"}`}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
                      {tag._count.projects} proje
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold text-site-fg group-hover:text-site-primary">
                      {tag.name}
                    </h2>
                    {tag.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-site-muted">
                        {tag.description}
                      </p>
                    ) : null}
                  </div>
                </SiteLink>
              ))}
            </div>
          )}
        </div>
      </section>

      <HomeCta />
    </>
  );
}
