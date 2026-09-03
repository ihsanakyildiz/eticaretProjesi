import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseStockDocumentKind,
  parseStockDocumentStatus,
} from "@/lib/inventory-labels";
import { locationHint } from "@/lib/inventory-locations";
import { prisma } from "@/lib/prisma";
import { StockDocumentEditor } from "../document-editor";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  const { id } = await params;
  const document = await prisma.stockDocument.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: document?.number ?? "Stok belgesi" };
}

export default async function StockDocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const document = await prisma.stockDocument.findUnique({
    where: { id },
    include: {
      relatedDocument: { select: { number: true } },
      lines: {
        orderBy: { sortOrder: "asc" },
        include: {
          variant: {
            select: {
              sku: true,
              barcode: true,
              title: true,
              image: true,
              product: {
                select: {
                  title: true,
                  image: true,
                  images: {
                    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!document) notFound();
  const kind = parseStockDocumentKind(document.kind);
  const status = parseStockDocumentStatus(document.status);
  if (!kind || !status) notFound();

  const variantIds = document.lines.map((line) => line.variantId);
  const [warehouses, suppliers, locations, stocks] = await Promise.all([
    prisma.stockWarehouse.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, city: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.stockLocation.findMany({
      where: { warehouseId: document.warehouseId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { id: true, code: true, aisle: true, rack: true, shelf: true },
    }),
    variantIds.length
      ? prisma.warehouseStock.findMany({
          where: { warehouseId: document.warehouseId, variantId: { in: variantIds } },
          select: {
            variantId: true,
            quantity: true,
            locationId: true,
            location: { select: { code: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const stockByVariant = new Map(stocks.map((row) => [row.variantId, row]));
  const lines = document.lines.map((line) => {
    const stock = stockByVariant.get(line.variantId);
    return {
      id: line.id,
      variantId: line.variantId,
      quantity: line.quantity,
      unitCostMinor: line.unitCostMinor,
      notes: line.notes,
      sku: line.variant.sku,
      barcode: line.variant.barcode,
      title: line.variant.title,
      productTitle: line.variant.product.title,
      image: line.variant.image ?? line.variant.product.image ?? line.variant.product.images[0]?.url ?? null,
      warehouseOnHand: stock?.quantity ?? 0,
      locationId: stock?.locationId ?? null,
      locationCode: stock?.location?.code ?? null,
    };
  });

  return (
    <StockDocumentEditor
      document={{
        id: document.id,
        number: document.number,
        kind,
        status,
        warehouseId: document.warehouseId,
        targetWarehouseId: document.targetWarehouseId,
        supplierId: document.supplierId,
        relatedDocumentId: document.relatedDocumentId,
        relatedNumber: document.relatedDocument?.number ?? null,
        externalNumber: document.externalNumber,
        documentDate: document.documentDate.toISOString(),
        notes: document.notes,
        lines,
        warehouses,
        suppliers,
        locations: locations.map((row) => ({
          id: row.id,
          code: row.code,
          hint: locationHint(row),
        })),
      }}
    />
  );
}
