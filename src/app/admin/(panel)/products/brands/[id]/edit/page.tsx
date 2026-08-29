import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrandForm } from "../../brand-form";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, publicBrandIndexPath } from "@/lib/url-structure";

type EditBrandPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditBrandPageProps): Promise<Metadata> {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: brand ? `Düzenle: ${brand.name}` : "Marka Düzenle",
  };
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Marka Düzenle</h1>
        <p className="mt-2 text-sm text-slate-500">{brand.name}</p>
      </div>

      <BrandForm
        mode="edit"
        brandPathPreview={publicBrandIndexPath(parseUrlStructure(settings))}
        initial={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          tagline: brand.tagline ?? undefined,
          website: brand.website ?? undefined,
          country: brand.country ?? undefined,
          logo: brand.logo ?? undefined,
          banner: brand.banner ?? undefined,
          description: brand.description ?? undefined,
          seoTitle: brand.seoTitle ?? undefined,
          seoDescription: brand.seoDescription ?? undefined,
          notes: brand.notes ?? undefined,
          sortOrder: brand.sortOrder,
          isActive: brand.isActive,
        }}
      />
    </div>
  );
}
