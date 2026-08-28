import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "../../card-form";

type EditCardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: card ? `Düzenle: ${card.title}` : "Kart Düzenle" };
}

export default async function EditCardPage({ params }: EditCardPageProps) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) notFound();

  const pages = await prisma.page.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true },
  });

  const pageOptions = pages.map((page) => ({
    id: page.id,
    label: page.title,
    depth: 0,
    href: `/${page.slug}`,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Kartlar
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Kartı Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {card.title}{" "}
          <span className="text-slate-400">
            · {card.type === "ADVANCED" ? "Gelişmiş" : "Klasik"}
          </span>
        </p>
      </div>
      <CardForm
        mode="edit"
        cardType={card.type}
        pageOptions={pageOptions}
        initial={{
          id: card.id,
          type: card.type,
          title: card.title,
          badgeText: card.badgeText,
          subtitle: card.subtitle,
          description: card.description,
          features: card.features,
          layout: card.layout,
          mediaType: card.mediaType,
          image: card.image,
          icon: card.icon,
          showFrame: card.showFrame,
          showSparkles: card.showSparkles,
          videoLabel: card.videoLabel,
          videoUrl: card.videoUrl,
          profileName: card.profileName,
          profileRole: card.profileRole,
          profileImage: card.profileImage,
          statValue: card.statValue,
          statLabel: card.statLabel,
          href: card.href,
          sortOrder: card.sortOrder,
          isActive: card.isActive,
        }}
      />
    </div>
  );
}
