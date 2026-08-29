import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaxRateForm } from "../../tax-rate-form";

type EditTaxRatePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditTaxRatePageProps): Promise<Metadata> {
  const { id } = await params;
  const rate = await prisma.taxRate.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: rate ? `Düzenle: ${rate.name}` : "KDV Oranı Düzenle" };
}

export default async function EditTaxRatePage({ params }: EditTaxRatePageProps) {
  const { id } = await params;
  const rate = await prisma.taxRate.findUnique({ where: { id } });
  if (!rate) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">KDV Oranı Düzenle</h1>
        <p className="mt-2 text-sm text-slate-500">{rate.name}</p>
      </div>

      <TaxRateForm
        mode="edit"
        initial={{
          id: rate.id,
          name: rate.name,
          percent: rate.percent,
          sortOrder: rate.sortOrder,
          isActive: rate.isActive,
          isDefault: rate.isDefault,
        }}
      />
    </div>
  );
}
