import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HeroForm } from "../../hero-form";
import { HeroSlidesPanel } from "../../slides-panel";

type EditHeroPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditHeroPageProps): Promise<Metadata> {
  const { id } = await params;
  const hero = await prisma.hero.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: hero ? `Düzenle: ${hero.name}` : "Hero Düzenle" };
}

export default async function EditHeroPage({ params }: EditHeroPageProps) {
  const { id } = await params;
  const hero = await prisma.hero.findUnique({
    where: { id },
    include: {
      slides: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { media: true } } },
      },
    },
  });
  if (!hero) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Hero</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Hero Alanını Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {hero.name} · /{hero.slug}
        </p>
      </div>

      <HeroSlidesPanel
        heroId={hero.id}
        slides={hero.slides.map((slide) => ({
          id: slide.id,
          label: slide.label,
          headline: slide.headline,
          isActive: slide.isActive,
          sortOrder: slide.sortOrder,
          layout: slide.layout,
          _count: slide._count,
        }))}
      />

      <HeroForm
        mode="edit"
        initial={{
          id: hero.id,
          name: hero.name,
          slug: hero.slug,
          description: hero.description ?? "",
          sortOrder: hero.sortOrder,
          isActive: hero.isActive,
          autoplay: hero.autoplay,
          intervalMs: hero.intervalMs,
          showDots: hero.showDots,
          showArrows: hero.showArrows,
        }}
      />
    </div>
  );
}
