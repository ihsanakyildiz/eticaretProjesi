import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductAttributeForm } from "../../attribute-form";
import { ProductAttributeValuesPanel } from "../../values-panel";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const attribute = await prisma.productAttribute.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: attribute ? `Düzenle: ${attribute.name}` : "Özellik düzenle" };
}

export default async function EditProductAttributePage({ params }: EditPageProps) {
  const { id } = await params;
  const attribute = await prisma.productAttribute.findUnique({
    where: { id },
    include: {
      values: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!attribute) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Mağaza
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Özelliği düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {attribute.name} · {attribute.slug}
        </p>
      </div>

      <ProductAttributeValuesPanel
        attributeId={attribute.id}
        attributeName={attribute.name}
        displayType={attribute.displayType}
        values={attribute.values.map((value) => ({
          id: value.id,
          name: value.name,
          slug: value.slug,
          colorHex: value.colorHex,
          image: value.image,
          isActive: value.isActive,
          sortOrder: value.sortOrder,
        }))}
      />

      <ProductAttributeForm
        mode="edit"
        initial={{
          id: attribute.id,
          name: attribute.name,
          slug: attribute.slug,
          description: attribute.description ?? "",
          displayType: attribute.displayType,
          sortOrder: attribute.sortOrder,
          isActive: attribute.isActive,
        }}
      />
    </div>
  );
}
