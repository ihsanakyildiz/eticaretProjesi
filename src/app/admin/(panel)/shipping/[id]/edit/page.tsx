import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ShippingCarrierProviderId } from "@/config/shipping-carriers";
import { prisma } from "@/lib/prisma";
import { arasApiPublicView } from "@/lib/aras-kargo";
import { yurticiApiPublicView } from "@/lib/yurtici-kargo";
import { ShippingCarrierForm } from "../../shipping-form";

type EditShippingCarrierPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditShippingCarrierPageProps): Promise<Metadata> {
  const { id } = await params;
  const carrier = await prisma.shippingCarrier.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: carrier ? `Düzenle: ${carrier.name}` : "Kargo firması düzenle",
  };
}

export default async function EditShippingCarrierPage({
  params,
}: EditShippingCarrierPageProps) {
  const { id } = await params;
  const carrier = await prisma.shippingCarrier.findUnique({ where: { id } });
  if (!carrier) notFound();
  const yurticiApi = yurticiApiPublicView(carrier.apiSettings);
  const arasApi = arasApiPublicView(carrier.apiSettings);
  const api =
    carrier.provider === "ARAS"
      ? {
          username: arasApi.username,
          environment: arasApi.environment,
          language: "TR" as const,
          customerCode: arasApi.customerCode,
          hasPassword: arasApi.hasPassword,
        }
      : {
          username: yurticiApi.username,
          environment: yurticiApi.environment,
          language: yurticiApi.language,
          customerCode: "",
          hasPassword: yurticiApi.hasPassword,
        };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Kargo firması düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{carrier.name}</p>
      </div>

      <ShippingCarrierForm
        mode="edit"
        initial={{
          id: carrier.id,
          name: carrier.name,
          slug: carrier.slug,
          provider: carrier.provider as ShippingCarrierProviderId,
          trackingUrlTemplate: carrier.trackingUrlTemplate ?? undefined,
          website: carrier.website ?? undefined,
          phone: carrier.phone ?? undefined,
          email: carrier.email ?? undefined,
          logo: carrier.logo ?? undefined,
          notes: carrier.notes ?? undefined,
          sortOrder: carrier.sortOrder,
          isActive: carrier.isActive,
          apiUsername: api.username,
          apiEnvironment: api.environment,
          apiLanguage: api.language,
          apiCustomerCode: api.customerCode,
          apiHasPassword: api.hasPassword,
        }}
      />
    </div>
  );
}
