import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectClientForm } from "../../client-form";

type EditProjectClientPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditProjectClientPageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await prisma.projectClient.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: client ? `Düzenle: ${client.name}` : "Müşteri Düzenle",
  };
}

export default async function EditProjectClientPage({
  params,
}: EditProjectClientPageProps) {
  const { id } = await params;
  const client = await prisma.projectClient.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Projeler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Müşteri Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{client.name}</p>
      </div>

      <ProjectClientForm
        mode="edit"
        initial={{
          id: client.id,
          name: client.name,
          slug: client.slug,
          sector: client.sector ?? undefined,
          website: client.website ?? undefined,
          description: client.description ?? undefined,
          logo: client.logo ?? undefined,
          sortOrder: client.sortOrder,
          isActive: client.isActive,
        }}
      />
    </div>
  );
}
