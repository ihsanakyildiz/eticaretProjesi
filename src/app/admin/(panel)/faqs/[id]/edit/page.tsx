import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FaqGroupForm } from "../../faq-group-form";
import { FaqItemsPanel } from "../../faq-items-panel";

type EditFaqGroupPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditFaqGroupPageProps): Promise<Metadata> {
  const { id } = await params;
  const group = await prisma.faqGroup.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: group ? `Düzenle: ${group.name}` : "SSS Grubu Düzenle" };
}

export default async function EditFaqGroupPage({ params }: EditFaqGroupPageProps) {
  const { id } = await params;
  const group = await prisma.faqGroup.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">SSS</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          SSS Grubunu Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {group.name} · /{group.slug}
        </p>
      </div>

      <FaqItemsPanel
        groupId={group.id}
        groupName={group.name}
        items={group.items.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
        }))}
      />

      <FaqGroupForm
        mode="edit"
        initial={{
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description ?? "",
          sortOrder: group.sortOrder,
          isActive: group.isActive,
        }}
      />
    </div>
  );
}
