import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HeroLcpPreload } from "@/components/site/home/hero-lcp-preload";
import { HomeHeroSlider } from "@/components/site/home/home-hero-slider";
import { JsonLd } from "@/components/site/json-ld";
import { PageSectionsRenderer } from "@/components/site/page-sections-renderer";
import {
  DEFAULT_HERO_SLIDE,
  getHeroBySlug,
  getHeroLcpImageUrl,
  mapHeroSlideToProps,
} from "@/lib/heroes";
import { getFaqGroupBySlug } from "@/lib/faqs";
import { buildHomeJsonLd } from "@/lib/json-ld";
import { getCachedHomepageAdvanced } from "@/lib/pages";
import { getActivePricingPlans, getPricingBillingOptions } from "@/lib/pricing";
import { auth } from "@/auth";
import { getMembershipFlags } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { resolveHomeMetadata } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;

function homeSeoCopy(
  settings: Record<string, string>,
  advanced?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
    title?: string | null;
  },
) {
  const metadata = resolveHomeMetadata(settings, advanced);
  const title =
    typeof metadata.title === "object" &&
    metadata.title &&
    "absolute" in metadata.title
      ? String(metadata.title.absolute ?? "")
      : settings.seo_title || settings.site_name || "İhsan Akyıldız";
  return {
    metadata,
    title,
    description: String(metadata.description ?? ""),
  };
}

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);
const HomeFaq = dynamic(() =>
  import("@/components/site/home/home-faq").then((mod) => mod.HomeFaq),
);
const HomeInsights = dynamic(() =>
  import("@/components/site/home/home-insights").then((mod) => mod.HomeInsights),
);
const HomePricing = dynamic(() =>
  import("@/components/site/home/home-pricing").then((mod) => mod.HomePricing),
);
const HomeProjects = dynamic(() =>
  import("@/components/site/home/home-projects").then((mod) => mod.HomeProjects),
);
const HomeServices = dynamic(() =>
  import("@/components/site/home/home-services").then((mod) => mod.HomeServices),
);
const HomeTrusted = dynamic(() =>
  import("@/components/site/home/home-trusted").then((mod) => mod.HomeTrusted),
);
const HomeWhyUs = dynamic(() =>
  import("@/components/site/home/home-why-us").then((mod) => mod.HomeWhyUs),
);
const HomeWorks = dynamic(() =>
  import("@/components/site/home/home-works").then((mod) => mod.HomeWorks),
);

export async function generateMetadata(): Promise<Metadata> {
  const [settings, advanced] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getCachedHomepageAdvanced().catch(() => null),
  ]);

  return homeSeoCopy(settings, advanced ?? undefined).metadata;
}

export default async function HomePage() {
  const [settings, membership, billingOptions, session] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getMembershipFlags(),
    getPricingBillingOptions(),
    auth(),
  ]);
  const siteName = settings.site_name || "İhsan Akyıldız";
  const purchaseEnabled = membership.enabled && membership.stripeEnabled;
  const isAuthenticated = Boolean(session?.user?.id);

  const advancedHome = await getCachedHomepageAdvanced().catch(() => null);
  if (advancedHome) {
    const homeSeo = homeSeoCopy(settings, advancedHome);
    const faqs = advancedHome.sections.flatMap(
      (section) =>
        section.faqGroup?.items?.map((item) => ({
          question: item.question,
          answer: item.answer,
        })) ?? [],
    );
    return (
      <>
        <JsonLd
          data={buildHomeJsonLd({
            settings,
            title: homeSeo.title,
            description: homeSeo.description,
            faqs,
          })}
        />
        <PageSectionsRenderer
          sections={advancedHome.sections}
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
      </>
    );
  }

  const [hero, cards, clients, projects, projectFeatures, works, workCategories, posts, faqGroup, pricingPlans] =
    await Promise.all([
    getHeroBySlug("anasayfa-hero").catch(() => null),
    prisma.card
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    prisma.projectClient
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          logo: true,
          website: true,
          sector: true,
        },
      })
      .catch(() => []),
    prisma.project
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
        },
      })
      .catch(() => []),
    prisma.projectFeature
      .findMany({
        where: { isActive: true, showOnHome: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          description: true,
        },
      })
      .catch(() => []),
    prisma.work
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 18,
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          previewImage: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
      })
      .catch(() => []),
    prisma.workCategory
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      })
      .catch(() => []),
    prisma.blogPost
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
          category: { select: { name: true } },
        },
      })
      .catch(() => []),
    getFaqGroupBySlug("anasayfa-sss").catch(() => null),
    getActivePricingPlans().catch(() => []),
  ]);

  const heroSlides =
    hero?.slides?.map((item, index) =>
      mapHeroSlideToProps(item, siteName, { priority: index === 0 }),
    ) ?? [];

  const classicCards = cards.filter((card) => card.type === "CLASSIC").slice(0, 6);
  const advancedCard =
    cards.find((card) => card.type === "ADVANCED") ?? null;

  const homeSeo = homeSeoCopy(settings);

  const resolvedHeroSlides =
    heroSlides.length > 0
      ? heroSlides
      : [
          mapHeroSlideToProps(
            {
              ...DEFAULT_HERO_SLIDE,
              headline: DEFAULT_HERO_SLIDE.headline,
            },
            siteName,
            { priority: true },
          ),
        ];

  return (
    <>
      <JsonLd
        data={buildHomeJsonLd({
          settings,
          title: homeSeo.title,
          description: homeSeo.description,
          faqs: faqGroup?.items.map((item) => ({
            question: item.question,
            answer: item.answer,
          })),
        })}
      />
      <HeroLcpPreload src={getHeroLcpImageUrl(resolvedHeroSlides)} />
      <HomeHeroSlider
        slides={resolvedHeroSlides}
        autoplay={hero?.autoplay ?? true}
        intervalMs={hero?.intervalMs ?? 6000}
        showDots={hero?.showDots ?? true}
        showArrows={hero?.showArrows ?? true}
      />

      <HomeTrusted
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          logo: client.logo,
          website: client.website,
          sector: client.sector,
        }))}
      />

      <div id="hizmetler">
        <HomeServices
          items={classicCards.map((card) => ({
            title: card.title,
            href: card.href || "/hizmetler",
            icon: card.icon,
            image: card.image,
            mediaType: card.mediaType,
            description: card.description ?? undefined,
          }))}
        />
      </div>

      <HomeWhyUs
        card={
          advancedCard
            ? {
                title: advancedCard.title,
                badgeText: advancedCard.badgeText,
                subtitle: advancedCard.subtitle,
                description: advancedCard.description,
                features: advancedCard.features,
                layout: advancedCard.layout,
                image: advancedCard.image,
                showFrame: advancedCard.showFrame,
                showSparkles: advancedCard.showSparkles,
                videoLabel: advancedCard.videoLabel,
                videoUrl: advancedCard.videoUrl,
                profileName: advancedCard.profileName,
                profileRole: advancedCard.profileRole,
                profileImage: advancedCard.profileImage,
                statValue: advancedCard.statValue,
                statLabel: advancedCard.statLabel,
              }
            : null
        }
      />

      <div id="projeler">
        <HomeProjects
          features={projectFeatures.map((feature) => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
          }))}
          projects={projects.map((project) => ({
            title: project.title,
            summary: project.summary || "Detaylar için projeyi inceleyin.",
            image: project.image,
            href: `/projeler/${project.slug}`,
          }))}
        />
      </div>

      <div id="yapilan-isler">
        <HomeWorks
          categories={workCategories
            .filter((category) =>
              works.some((work) => work.categoryId === category.id),
            )
            .map((category) => ({
              id: category.id,
              name: category.name,
            }))}
          works={works.map((work) => ({
            id: work.id,
            title: work.title,
            href: `/yapilan-isler/${work.slug}`,
            image: work.image,
            previewImage: work.previewImage,
            categoryId: work.categoryId,
            categoryName: work.category?.name ?? null,
          }))}
        />
      </div>

      <HomeInsights
        posts={posts.map((post) => ({
          title: post.title,
          summary: post.summary || "Yazıyı okumak için tıklayın.",
          image: post.image,
          category: post.category?.name,
          href: `/blog/${post.slug}`,
        }))}
      />

      <div id="fiyatlandirma">
        <HomePricing
          plans={pricingPlans}
          purchaseEnabled={purchaseEnabled}
          membershipEnabled={membership.enabled}
          isAuthenticated={isAuthenticated}
          billingOptions={billingOptions}
        />
      </div>

      <div id="sss">
        <HomeFaq
          items={faqGroup?.items.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
          }))}
        />
      </div>

      <HomeCta />
    </>
  );
}
