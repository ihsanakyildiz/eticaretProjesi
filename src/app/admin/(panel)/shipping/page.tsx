import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { parseArasApiSettings, arasCredentialsReady } from "@/lib/aras-kargo";
import { parseYurticiApiSettings, yurticiCredentialsReady } from "@/lib/yurtici-kargo";
import { ShippingCarriersTable } from "./shipping-table";

export const metadata: Metadata = {
  title: "Kargo firmaları",
  description: "Kargo firmalarını yönetin",
};

async function loadCarriers() {
  try {
    return {
      carriers: await prisma.shippingCarrier.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          provider: true,
          phone: true,
          website: true,
          logo: true,
          isActive: true,
          sortOrder: true,
          apiSettings: true,
        },
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      carriers: [],
      loadError: "Kargo firmaları yüklenemedi. Geliştirme sunucusunu yeniden başlatın.",
    };
  }
}

export default async function ShippingCarriersPage() {
  const { carriers, loadError } = await loadCarriers();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Truck className="h-6 w-6 text-[#405189]" />
              Kargo firmaları
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Siparişlerde kullanılacak kargo firmalarını ekleyin. Yurtiçi ve Aras Kargo için web
              servis bilgilerini firma kartından kaydedin.
            </p>
          </div>
          <Can resource="shipping" action="create">
            <Link
              href="/admin/shipping/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni kargo firması
            </Link>
          </Can>
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {loadError}
        </div>
      ) : null}

      <ShippingCarriersTable
        carriers={carriers.map((carrier) => ({
          id: carrier.id,
          name: carrier.name,
          slug: carrier.slug,
          provider: carrier.provider,
          phone: carrier.phone,
          website: carrier.website,
          logo: carrier.logo,
          isActive: carrier.isActive,
          sortOrder: carrier.sortOrder,
          apiConfigured:
            (carrier.provider === "YURTICI" &&
              yurticiCredentialsReady(parseYurticiApiSettings(carrier.apiSettings))) ||
            (carrier.provider === "ARAS" &&
              arasCredentialsReady(parseArasApiSettings(carrier.apiSettings))),
        }))}
      />
    </div>
  );
}
