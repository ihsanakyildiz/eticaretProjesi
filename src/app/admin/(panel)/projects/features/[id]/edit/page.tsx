import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectFeatureForm } from "../../feature-form";

type EditProjectFeaturePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditProjectFeaturePageProps): Promise<Metadata> {
  const { id } = await params;
  const feature = await prisma.projectFeature.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: feature ? `Düzenle: ${feature.name}` : "Özellik Düzenle",
  };
}

export default async function EditProjectFeaturePage({
  params,
}: EditProjectFeaturePageProps) {
  const { id } = await params;
  const feature = await prisma.projectFeature.findUnique({ where: { id } });
  if (!feature) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Projeler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Özellik Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{feature.name}</p>
      </div>

      <ProjectFeatureForm
        mode="edit"
        initial={{
          id: feature.id,
          name: feature.name,
          slug: feature.slug,
          description: feature.description ?? undefined,
          icon: feature.icon ?? undefined,
          iconColor: feature.iconColor ?? undefined,
          sortOrder: feature.sortOrder,
          isActive: feature.isActive,
          showOnHome: feature.showOnHome,
        }}
      />
    </div>
  );
}
