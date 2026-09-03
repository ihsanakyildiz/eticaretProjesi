import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseStockDocumentKind,
  stockDocumentKindLabel,
  stockDocumentStatusLabel,
} from "@/lib/inventory-labels";
import { prisma } from "@/lib/prisma";
import { StockDocumentPrint } from "./print-view";

type PrintPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const document = await prisma.stockDocument.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: document ? `Yazdır ${document.number}` : "Yazdır" };
}

export default async function StockDocumentPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const document = await prisma.stockDocument.findUnique({
    where: { id },
    include: {
      warehouse: true,
      targetWarehouse: true,
      supplier: { select: { name: true, taxNumber: true, address: true, city: true } },
      relatedDocument: { select: { number: true } },
      lines: {
        orderBy: { sortOrder: "asc" },
        include: {
          variant: {
            select: {
              sku: true,
              barcode: true,
              title: true,
              product: { select: { title: true } },
            },
          },
        },
      },
    },
  });
  if (!document) notFound();
  const kind = parseStockDocumentKind(document.kind);
  if (!kind) notFound();

  return (
    <StockDocumentPrint
      document={{
        number: document.number,
        kindLabel: stockDocumentKindLabel(kind),
        statusLabel: stockDocumentStatusLabel(
          document.status === "CONFIRMED"
            ? "CONFIRMED"
            : document.status === "CANCELED"
              ? "CANCELED"
              : "DRAFT",
        ),
        date: document.documentDate.toLocaleDateString("tr-TR"),
        externalNumber: document.externalNumber,
        notes: document.notes,
        warehouseName: `${document.warehouse.name}${document.warehouse.city ? ` · ${document.warehouse.city}` : ""}`,
        warehouseAddress: document.warehouse.address,
        targetWarehouseName: document.targetWarehouse
          ? `${document.targetWarehouse.name}${document.targetWarehouse.city ? ` · ${document.targetWarehouse.city}` : ""}`
          : null,
        supplierName: document.supplier?.name ?? null,
        supplierDetail: document.supplier
          ? [document.supplier.taxNumber, document.supplier.city, document.supplier.address]
              .filter(Boolean)
              .join(" · ")
          : null,
        relatedNumber: document.relatedDocument?.number ?? null,
        lines: document.lines.map((line) => ({
          productTitle: line.variant.product.title,
          variantTitle: line.variant.title,
          sku: line.variant.sku,
          barcode: line.variant.barcode,
          quantity: line.quantity,
          unitCostMinor: line.unitCostMinor,
        })),
      }}
    />
  );
}
