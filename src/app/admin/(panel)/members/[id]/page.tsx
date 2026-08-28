import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MemberEditForm } from "./member-edit-form";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Üye Düzenle",
};

export default async function MemberEditPage({ params }: Props) {
  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { pricingPlan: { select: { name: true } } },
      },
    },
  });

  if (!member || member.role !== Role.MEMBER) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Üyeler</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          {member.name || member.email}
        </h1>
      </div>

      <MemberEditForm
        id={member.id}
        name={member.name ?? ""}
        email={member.email}
        phone={member.phone ?? ""}
        isActive={member.isActive}
      />

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Abonelikler</h2>
        {member.subscriptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Abonelik kaydı yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e9ebec]">
            {member.subscriptions.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{sub.pricingPlan.name}</p>
                  <p className="text-xs text-slate-500">
                    {sub.status} · {sub.billingInterval}
                    {sub.stripeSubscriptionId ? ` · ${sub.stripeSubscriptionId}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {sub.currentPeriodEnd
                    ? `Dönem sonu: ${new Intl.DateTimeFormat("tr-TR").format(sub.currentPeriodEnd)}`
                    : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
