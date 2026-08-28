import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { PageSectionsRenderer } from "@/components/site/page-sections-renderer";
import { SiteSidebarPageLayout } from "@/components/site/site-sidebar-layout";
import {
  getAdvancedPageBySlug,
  getClassicPageBySlug,
  resolvePageSections,
} from "@/lib/pages";
import { getSettingsMap } from "@/lib/settings";
import { auth } from "@/auth";
import { getMembershipFlags } from "@/lib/membership";
import { resolvePricingBillingOptions } from "@/lib/pricing";
import { prepareRichHtml } from "@/lib/html";
import { buildCollectionJsonLd, buildWebPageJsonLd } from "@/lib/json-ld";
import { parsePerformance } from "@/lib/performance";
import { publicPageHref } from "@/lib/public-urls";
import { buildPublicMetadata, resolvePageSeo } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "projeler",
  "blog",
  "yapilan-isler",
  "anasayfa",
  "giris",
  "kayit",
  "uye",
  "sifremi-unuttum",
  "sifre-sifirla",
  "paket",
]);

function PageBodyWithOptionalSidebar({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <section className="py-12 sm:py-16">
      <SiteSidebarPageLayout location="PAGE_DETAIL">
        {children}
      </SiteSidebarPageLayout>
    </section>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};

  const [advanced, classic, settings] = await Promise.all([
    getAdvancedPageBySlug(slug).catch(() => null),
    getClassicPageBySlug(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const page = advanced ?? classic;
  if (!page) return { title: "Sayfa bulunamadı" };

  const seo = resolvePageSeo({
    title: page.title,
    summary: page.summary,
    content: page.content,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  });

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path: publicPageHref(slug),
    image: page.image,
  });
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const [membership, session] = await Promise.all([
    getMembershipFlags(),
    auth(),
  ]);
  const billingOptions = resolvePricingBillingOptions(settings);
  const siteName = settings.site_name || "İhsan Akyıldız";
  const purchaseEnabled = membership.enabled && membership.stripeEnabled;
  const isAuthenticated = Boolean(session?.user?.id);

  const advanced = await getAdvancedPageBySlug(slug).catch(() => null);
  if (advanced) {
    const sections = await resolvePageSections(advanced.sections);
    const seo = resolvePageSeo({
      title: advanced.title,
      summary: advanced.summary,
      content: advanced.content,
      seoTitle: advanced.seoTitle,
      seoDescription: advanced.seoDescription,
    });
    const path = publicPageHref(slug);
    const jsonLd =
      slug === "hizmetler"
        ? buildCollectionJsonLd({
            settings,
            title: seo.seoTitle,
            description: seo.seoDescription,
            path,
            crumbs: [
              { name: "Ana Sayfa", path: "/" },
              { name: advanced.title, path },
            ],
          })
        : buildWebPageJsonLd({
            settings,
            title: seo.seoTitle,
            description: seo.seoDescription,
            path,
            image: advanced.image,
            crumbs: [
              { name: "Ana Sayfa", path: "/" },
              { name: advanced.title, path },
            ],
          });

    const body = (
      <PageSectionsRenderer
        sections={sections}
        siteName={siteName}
        purchaseEnabled={purchaseEnabled}
        membershipEnabled={membership.enabled}
        isAuthenticated={isAuthenticated}
        billingOptions={billingOptions}
        contactInfo={{
          email: settings.contact_email,
          phone: settings.contact_phone,
          whatsapp: settings.contact_whatsapp,
          address: settings.contact_address,
          workingHours: settings.contact_working_hours,
          mapEmbed: settings.contact_map_embed,
        }}
      />
    );

    return (
      <>
        <JsonLd data={jsonLd} />
        {advanced.sidebarEnabled ? (
          <PageBodyWithOptionalSidebar enabled>
            {body}
          </PageBodyWithOptionalSidebar>
        ) : (
          body
        )}
      </>
    );
  }

  const classic = await getClassicPageBySlug(slug).catch(() => null);
  if (!classic) notFound();

  const perf = parsePerformance(settings);
  const classicContent = prepareRichHtml(classic.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const classicSummary = prepareRichHtml(classic.summary, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  const seo = resolvePageSeo({
    title: classic.title,
    summary: classic.summary,
    content: classic.content,
    seoTitle: classic.seoTitle,
    seoDescription: classic.seoDescription,
  });
  const path = publicPageHref(slug);
  const jsonLd =
    slug === "hizmetler"
      ? buildCollectionJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: classic.title, path },
          ],
        })
      : buildWebPageJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          image: classic.image,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: classic.title, path },
          ],
        });

  const classicInner = (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight text-site-fg sm:text-5xl">
        {classic.title}
      </h1>
      {classicSummary.trim() ? (
        <div
          className="site-rich-content mt-4 text-lg text-site-muted"
          dangerouslySetInnerHTML={{ __html: classicSummary }}
        />
      ) : null}
      {classic.image ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2rem]">
          <Image
            src={classic.image}
            alt={classic.title}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
        </div>
      ) : null}
      {classicContent.trim() ? (
        <div
          className="site-rich-content mt-10"
          dangerouslySetInnerHTML={{ __html: classicContent }}
        />
      ) : null}

      {(classic.projects.length > 0 ||
        classic.works.length > 0 ||
        classic.posts.length > 0) && (
        <div className="mt-16 space-y-10 border-t border-site-border pt-10">
          {classic.projects.length > 0 ? (
            <section>
              <h2 className="text-xl font-semibold text-site-fg">Projeler</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {classic.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projeler/${project.slug}`}
                      className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                    >
                      {project.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {classic.works.length > 0 ? (
            <section>
              <h2 className="text-xl font-semibold text-site-fg">
                Yapılan işler
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {classic.works.map((work) => (
                  <li key={work.id}>
                    <Link
                      href={`/yapilan-isler/${work.slug}`}
                      className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                    >
                      {work.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {classic.posts.length > 0 ? (
            <section>
              <h2 className="text-xl font-semibold text-site-fg">Yazılar</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {classic.posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      {classic.sidebarEnabled ? (
        <PageBodyWithOptionalSidebar enabled>
          <article>{classicInner}</article>
        </PageBodyWithOptionalSidebar>
      ) : (
        <article className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{classicInner}</div>
        </article>
      )}
    </>
  );
}
