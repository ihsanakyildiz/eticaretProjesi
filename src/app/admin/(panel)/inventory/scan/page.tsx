import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { InventoryScanLauncher } from "./scan-launcher";

export const metadata: Metadata = { title: "El terminali" };

export default async function InventoryScanPage() {
  const [warehouses, drafts] = await Promise.all([
    prisma.stockWarehouse.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, city: true, isDefault: true },
    }),
    prisma.stockDocument.findMany({
      where: { status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        kind: true,
        warehouse: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
  ]);

  return (
    <InventoryScanLauncher
      warehouses={warehouses}
      drafts={drafts.map((row) => ({
        id: row.id,
        number: row.number,
        kind: row.kind,
        warehouseName: row.warehouse.name,
        lineCount: row._count.lines,
      }))}
    />
  );
}
