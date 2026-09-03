import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LocationsManager } from "./locations-manager";

export const metadata: Metadata = { title: "Raflar" };

type LocationsPageProps = {
  searchParams: Promise<{ warehouse?: string }>;
};

export default async function InventoryLocationsPage({ searchParams }: LocationsPageProps) {
  const params = await searchParams;
  const warehouses = await prisma.stockWarehouse.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, city: true },
  });
  const warehouseId =
    warehouses.find((row) => row.id === (params.warehouse ?? "").trim())?.id ?? warehouses[0]?.id ?? "";

  const locations = warehouseId
    ? await prisma.stockLocation.findMany({
        where: { warehouseId },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: { _count: { select: { stocks: true } } },
      })
    : [];

  return (
    <LocationsManager
      warehouseId={warehouseId}
      warehouses={warehouses}
      locations={locations.map((row) => ({
        id: row.id,
        code: row.code,
        aisle: row.aisle,
        rack: row.rack,
        shelf: row.shelf,
        notes: row.notes,
        isActive: row.isActive,
        stockCount: row._count.stocks,
      }))}
    />
  );
}
