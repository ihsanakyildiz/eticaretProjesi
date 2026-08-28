import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HeroSlideForm } from "../../../slide-form";

type NewSlidePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Yeni Hero Slayt",
};

export default async function NewHeroSlidePage({ params }: NewSlidePageProps) {
  const { id } = await params;
  const hero = await prisma.hero.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!hero) notFound();

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
          Yeni Slayt
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Gelişmiş hero ayarlarını sekmelerden özelleştirin.
        </p>
      </div>
      <HeroSlideForm mode="create" heroId={hero.id} heroName={hero.name} />
    </div>
  );
}
