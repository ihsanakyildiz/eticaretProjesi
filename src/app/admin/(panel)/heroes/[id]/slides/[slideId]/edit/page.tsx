import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { HeroMediaKindValue } from "@/lib/heroes";
import { prisma } from "@/lib/prisma";
import { HeroSlideForm } from "../../../../slide-form";

type EditSlidePageProps = {
  params: Promise<{ id: string; slideId: string }>;
};

export async function generateMetadata({ params }: EditSlidePageProps): Promise<Metadata> {
  const { slideId } = await params;
  const slide = await prisma.heroSlide.findUnique({
    where: { id: slideId },
    select: { label: true, headline: true },
  });
  return {
    title: slide ? `Slayt: ${slide.label || slide.headline}` : "Slayt Düzenle",
  };
}

export default async function EditHeroSlidePage({ params }: EditSlidePageProps) {
  const { id, slideId } = await params;
  const hero = await prisma.hero.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!hero) notFound();

  const slide = await prisma.heroSlide.findFirst({
    where: { id: slideId, heroId: id },
    include: {
      media: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!slide) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href={`/admin/heroes/${hero.id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {hero.name}
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-800 sm:text-2xl">
          Slaytı Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {slide.label || slide.headline}
        </p>
      </div>

      <HeroSlideForm
        mode="edit"
        heroId={hero.id}
        heroName={hero.name}
        initial={{
          id: slide.id,
          label: slide.label,
          isActive: slide.isActive,
          sortOrder: slide.sortOrder,
          badgeText: slide.badgeText,
          badgeIcon: slide.badgeIcon,
          kicker: slide.kicker,
          headline: slide.headline,
          headlineAccent: slide.headlineAccent,
          subheadline: slide.subheadline,
          ctaLabel: slide.ctaLabel,
          ctaUrl: slide.ctaUrl,
          ctaSecondaryLabel: slide.ctaSecondaryLabel,
          ctaSecondaryUrl: slide.ctaSecondaryUrl,
          trustLabel: slide.trustLabel,
          overlayPercent: slide.overlayPercent,
          titleColor: slide.titleColor,
          accentColor: slide.accentColor,
          subtitleColor: slide.subtitleColor,
          ctaBgColor: slide.ctaBgColor,
          ctaTextColor: slide.ctaTextColor,
          titleFont: slide.titleFont,
          titleSizePx: slide.titleSizePx,
          subtitleSizePx: slide.subtitleSizePx,
          imageWidthPx: slide.imageWidthPx,
          imageHeightPx: slide.imageHeightPx,
          layout: slide.layout,
          backgroundStyle: slide.backgroundStyle,
          backgroundImage: slide.backgroundImage,
          themeColor: slide.themeColor,
          showStars: slide.showStars,
          starCount: slide.starCount,
          showAvatars: slide.showAvatars,
          media: slide.media.map((item) => ({
            id: item.id,
            kind: item.kind as HeroMediaKindValue,
            image: item.image,
            label: item.label,
            alt: item.alt,
            href: item.href,
          })),
        }}
      />
    </div>
  );
}
