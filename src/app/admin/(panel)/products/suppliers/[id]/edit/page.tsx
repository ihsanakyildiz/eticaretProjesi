import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SupplierForm } from "../../supplier-form";

type EditSupplierPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditSupplierPageProps): Promise<Metadata> {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: supplier ? `Düzenle: ${supplier.name}` : "Tedarikçi Düzenle",
  };
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Tedarikçi Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{supplier.name}</p>
      </div>

      <SupplierForm
        mode="edit"
        initial={{
          id: supplier.id,
          name: supplier.name,
          slug: supplier.slug,
          legalName: supplier.legalName ?? undefined,
          taxNumber: supplier.taxNumber ?? undefined,
          taxOffice: supplier.taxOffice ?? undefined,
          contactName: supplier.contactName ?? undefined,
          email: supplier.email ?? undefined,
          phone: supplier.phone ?? undefined,
          phone2: supplier.phone2 ?? undefined,
          whatsapp: supplier.whatsapp ?? undefined,
          website: supplier.website ?? undefined,
          address: supplier.address ?? undefined,
          city: supplier.city ?? undefined,
          district: supplier.district ?? undefined,
          country: supplier.country ?? undefined,
          postalCode: supplier.postalCode ?? undefined,
          logo: supplier.logo ?? undefined,
          description: supplier.description ?? undefined,
          productInfo: supplier.productInfo ?? undefined,
          notes: supplier.notes ?? undefined,
          sortOrder: supplier.sortOrder,
          isActive: supplier.isActive,
        }}
      />
    </div>
  );
}
