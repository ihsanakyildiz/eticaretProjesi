import type { Metadata } from "next";
import { WarehouseListView } from "./warehouse-list-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Depo kargo transfer",
  description: "Gönderime hazır siparişleri paketleyin ve kargo etiketi yazdırın",
};

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WarehouseListView kind="ready" searchParams={await searchParams} />;
}
