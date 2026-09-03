import type { Metadata } from "next";
import { WarehouseListView } from "../warehouse-list-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kargolanan siparişler",
  description: "Kargoya çıkan siparişlerin etiketini tekrar yazdırın",
};

export default async function WarehouseShippedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <WarehouseListView kind="shipped" searchParams={await searchParams} />;
}
