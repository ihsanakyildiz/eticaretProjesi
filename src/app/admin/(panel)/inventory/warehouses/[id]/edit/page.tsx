import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WarehouseForm } from "../../warehouse-form";

type EditWarehousePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditWarehousePageProps): Promise<Metadata> {
  const { id } = await params;
  const warehouse = await prisma.stockWarehouse.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: warehouse ? `Düzenle: ${warehouse.name}` : "Depo düzenle" };
}

export default async function EditWarehousePage({ params }: EditWarehousePageProps) {
  const { id } = await params;
  const warehouse = await prisma.stockWarehouse.findUnique({ where: { id } });
  if (!warehouse) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Depo düzenle</h1>
        <p className="mt-2 text-sm text-slate-500">{warehouse.name}</p>
      </div>
      <WarehouseForm
        mode="edit"
        initial={{
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          city: warehouse.city,
          district: warehouse.district,
          address: warehouse.address,
          phone: warehouse.phone,
          notes: warehouse.notes,
          sortOrder: warehouse.sortOrder,
          isActive: warehouse.isActive,
          isDefault: warehouse.isDefault,
        }}
      />
    </div>
  );
}
