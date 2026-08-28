import type { CardLayout } from "@prisma/client";
import dynamic from "next/dynamic";
import { HeroLcpPreload } from "@/components/site/home/hero-lcp-preload";
import { HomeHeroSlider } from "@/components/site/home/home-hero-slider";
import { SiteLink } from "@/components/site/site-link";
import {
  groupGridChildren,
  PageGridRow,
} from "@/components/site/page-grid-row";
import { DEFAULT_HERO_SLIDE, getHeroLcpImageUrl, mapHeroSlideToProps } from "@/lib/heroes";
import { highlightRichCodeBlocks } from "@/lib/highlight-rich-html";
import type { ResolvedPageSection } from "@/lib/pages";
import type { PricingBillingOptions } from "@/lib/pricing";
import {
  getContactFormSettings,
  getContactInfoBlockSettings,
} from "@/lib/page-sections";

export type PageSectionsContactInfo = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  workingHours?: string;
  mapEmbed?: string;
};

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
const ContactFormSection = dynamic(() =>
  import("@/components/site/contact/contact-form-section").then(
    (mod) => mod.ContactFormSection,
  ),
);
const ContactInfoSection = dynamic(() =>
  import("@/components/site/contact/contact-info-section").then(
    (mod) => mod.ContactInfoSection,
  ),
);

function SectionShell({
  anchorId,
  children,
}: {
  anchorId?: string;
  children: React.ReactNode;
}) {
  if (!anchorId) return <>{children}</>;
  return <div id={anchorId}>{children}</div>;
}

function RichTextSection({
  title,
  subtitle,
  content,
}: {
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
}) {
  if (!title && !subtitle && !content) return null;
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {title ? (
          <h2 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <p className="mt-3 text-base text-site-muted">{subtitle}</p>
        ) : null}
        {content ? (
          <div
            className="site-rich-content mt-8"
            dangerouslySetInnerHTML={{ __html: highlightRichCodeBlocks(content) }}
          />
        ) : null}
      </div>
    </section>
  );
}

function CtaSection({
  title,
  subtitle,
  content,
  ctaLabel,
  ctaUrl,
}: {
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  if (title || subtitle || content || ctaLabel) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-site-primary px-6 py-14 text-center text-white shadow-2xl shadow-violet-500/30 sm:px-10">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {title || "Birlikte çalışalım"}
            </h2>
            {subtitle ? (
              <p className="mt-3 text-white/80">{subtitle}</p>
            ) : null}
            {content ? (
              <div
                className="mt-4 text-sm text-white/80 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : null}
            {ctaLabel ? (
              <div className="mt-8">
                <SiteLink
                  href={ctaUrl || "/iletisim"}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {ctaLabel}
                </SiteLink>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }
  return <HomeCta />;
}

export function PageSectionsRenderer({
  sections,
  siteName,
  contactInfo,
  purchaseEnabled = false,
  membershipEnabled = false,
  isAuthenticated = false,
  billingOptions,
}: {
  sections: ResolvedPageSection[];
  siteName: string;
  contactInfo?: PageSectionsContactInfo;
  purchaseEnabled?: boolean;
  membershipEnabled?: boolean;
  isAuthenticated?: boolean;
  billingOptions?: PricingBillingOptions;
}) {
  const renderSection = (
    section: ResolvedPageSection,
    nested = false,
  ): React.ReactNode => {
        const anchor = section.settings.anchorId;
        const shell = (node: React.ReactNode) =>
          nested ? (
            <div key={section.id} className="pg-nested-item">
              {node}
            </div>
          ) : (
            <SectionShell key={section.id} anchorId={anchor}>
              {node}
            </SectionShell>
          );

        switch (section.type) {
          case "HERO": {
            if (nested) return null;
            const heroSlides =
              section.hero?.slides?.map((item, index) =>
                mapHeroSlideToProps(item, siteName, { priority: index === 0 }),
              ) ?? [];

            const slides =
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

            return shell(
              <>
                <HeroLcpPreload src={getHeroLcpImageUrl(slides)} />
                <HomeHeroSlider
                  slides={slides}
                  autoplay={section.hero?.autoplay ?? true}
                  intervalMs={section.hero?.intervalMs ?? 6000}
                  showDots={section.hero?.showDots ?? true}
                  showArrows={section.hero?.showArrows ?? true}
                />
              </>,
            );
          }
          case "GRID_ROW": {
            const grouped = groupGridChildren(section.children, section.settings);
            const childrenByColumn = new Map<string, React.ReactNode[]>();
            for (const [columnId, kids] of grouped) {
              childrenByColumn.set(
                columnId,
                kids.map((child) => renderSection(child, true)),
              );
            }
            return shell(
              <PageGridRow
                settings={section.settings}
                title={section.title}
                subtitle={section.subtitle}
                eyebrow={section.settings.eyebrow}
                childrenByColumn={childrenByColumn}
              />,
            );
          }
          case "TRUSTED_CLIENTS":
            return shell(
              <HomeTrusted
                clients={section.clients}
                title={section.title}
                subtitle={section.subtitle}
              />,
            );
          case "CARDS":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeServices
                  title={section.title}
                  subtitle={section.subtitle}
                  eyebrow={section.settings.eyebrow}
                  enableSlider={section.settings.enableSlider === true}
                  sliderAutoplay={section.settings.sliderAutoplay !== false}
                  sliderEffect={section.settings.sliderEffect ?? "slide"}
                  cardsPerRow={section.settings.cardsPerRow ?? 3}
                  primaryCta={{
                    show: section.settings.showPrimaryCta !== false,
                    label: section.settings.primaryCtaLabel,
                    url: section.settings.primaryCtaUrl,
                  }}
                  secondaryCta={{
                    show: section.settings.showSecondaryCta !== false,
                    label: section.settings.secondaryCtaLabel,
                    url: section.settings.secondaryCtaUrl,
                  }}
                  items={section.cards.map((card) => ({
                    title: card.title,
                    href: card.href || "/hizmetler",
                    icon: card.icon,
                    image: card.image,
                    mediaType: card.mediaType,
                    description: card.description ?? undefined,
                  }))}
                />
              </SectionShell>
            );
          case "ADVANCED_CARD": {
            const card = section.cards[0] ?? null;
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeWhyUs
                  card={
                    card
                      ? {
                          title: card.title,
                          badgeText: card.badgeText,
                          subtitle: card.subtitle,
                          description: card.description,
                          features: card.features,
                          layout: card.layout as CardLayout,
                          image: card.image,
                          showFrame: card.showFrame,
                          showSparkles: card.showSparkles,
                          videoLabel: card.videoLabel,
                          videoUrl: card.videoUrl,
                          profileName: card.profileName,
                          profileRole: card.profileRole,
                          profileImage: card.profileImage,
                          statValue: card.statValue,
                          statLabel: card.statLabel,
                        }
                      : null
                  }
                />
              </SectionShell>
            );
          }
          case "PROJECTS":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeProjects
                  title={section.title}
                  subtitle={section.subtitle}
                  eyebrow={section.settings.eyebrow}
                  statValue={section.settings.statValue}
                  statDescription={section.settings.statDescription}
                  showFeatures={section.settings.showFeatures !== false}
                  features={section.projectFeatures}
                  projects={section.projects.map((project) => ({
                    title: project.title,
                    summary:
                      project.summary || "Detaylar için projeyi inceleyin.",
                    image: project.image,
                    href: `/projeler/${project.slug}`,
                  }))}
                />
              </SectionShell>
            );
          case "WORKS":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeWorks
                  title={section.title}
                  subtitle={section.subtitle}
                  eyebrow={section.settings.eyebrow}
                  categories={section.workCategories}
                  works={section.works.map((work) => ({
                    id: work.id,
                    title: work.title,
                    href: `/yapilan-isler/${work.slug}`,
                    image: work.image,
                    previewImage: work.previewImage,
                    categoryId: work.categoryId,
                    categoryName: work.categoryName,
                  }))}
                />
              </SectionShell>
            );
          case "BLOG":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeInsights
                  title={section.title}
                  subtitle={section.subtitle}
                  eyebrow={section.settings.eyebrow}
                  enableSlider={section.settings.enableSlider === true}
                  sliderAutoplay={section.settings.sliderAutoplay !== false}
                  sliderEffect={section.settings.sliderEffect ?? "slide"}
                  cardsPerRow={section.settings.cardsPerRow ?? 3}
                  posts={section.posts.map((post) => ({
                    title: post.title,
                    summary: post.summary || "Yazıyı okumak için tıklayın.",
                    image: post.image,
                    category: post.category ?? undefined,
                    href: `/blog/${post.slug}`,
                  }))}
                />
              </SectionShell>
            );
          case "FAQ":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomeFaq
                  title={section.title}
                  subtitle={section.subtitle}
                  items={section.faqGroup?.items.map((item) => ({
                    id: item.id,
                    question: item.question,
                    answer: item.answer,
                  }))}
                />
              </SectionShell>
            );
          case "RICH_TEXT":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <RichTextSection
                  title={section.title}
                  subtitle={section.subtitle}
                  content={section.content}
                />
              </SectionShell>
            );
          case "PRICING":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <HomePricing
                  title={section.title}
                  subtitle={section.subtitle}
                  plans={section.pricingPlans}
                  purchaseEnabled={purchaseEnabled}
                  membershipEnabled={membershipEnabled}
                  isAuthenticated={isAuthenticated}
                  billingOptions={billingOptions}
                  primaryCta={{
                    label: section.settings.pricingPrimaryCtaLabel,
                    url: section.settings.pricingPrimaryCtaUrl,
                  }}
                  secondaryCta={{
                    label: section.settings.pricingSecondaryCtaLabel,
                    url: section.settings.pricingSecondaryCtaUrl,
                  }}
                />
              </SectionShell>
            );
          case "CTA":
            return (
              <SectionShell key={section.id} anchorId={anchor}>
                <CtaSection
                  title={section.title}
                  subtitle={section.subtitle}
                  content={section.content}
                  ctaLabel={section.settings.ctaLabel}
                  ctaUrl={section.settings.ctaUrl}
                />
              </SectionShell>
            );
          case "CONTACT_FORM":
            return shell(
              <ContactFormSection
                sectionId={section.id}
                title={section.title}
                subtitle={section.subtitle}
                eyebrow={section.settings.eyebrow}
                config={getContactFormSettings(section.settings)}
              />,
            );
          case "CONTACT_INFO":
            return shell(
              <ContactInfoSection
                title={section.title}
                subtitle={section.subtitle}
                eyebrow={section.settings.eyebrow}
                config={getContactInfoBlockSettings(section.settings)}
                contact={contactInfo ?? {}}
              />,
            );
          default: {
            const _exhaustive: never = section.type;
            void _exhaustive;
            return null;
          }
        }
  };

  return <>{sections.map((section) => renderSection(section))}</>;
}
