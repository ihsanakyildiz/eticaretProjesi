/**
 * Merkez (MERKEZ / varsayılan) depo stoklarını tamamen temizler:
 * - quantity != 0 ise ADJUSTMENT hareketi yazar ve 0'a çeker
 * - warehouse_stocks satırlarını siler (STOK SATIRI da 0 olur)
 * - product_variants.stockQuantity diğer depoların toplamına çekilir
 * - supplierStock değişmez
 *
 * Kullanım:
 *   node scripts/zero-merkez-warehouse.js
 *   node scripts/zero-merkez-warehouse.js --dry-run
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const note = "Merkez depo toplu sıfırlama (hatalı XML/API stoğu)";
const CHUNK = 200;

async function main() {
  const warehouse = await prisma.stockWarehouse.findFirst({
    where: { OR: [{ code: "MERKEZ" }, { isDefault: true }] },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, code: true, name: true, isDefault: true },
  });
  if (!warehouse) throw new Error("Merkez depo bulunamadı.");

  const before = await prisma.warehouseStock.aggregate({
    where: { warehouseId: warehouse.id },
    _sum: { quantity: true },
    _count: true,
  });
  const allRows = await prisma.warehouseStock.findMany({
    where: { warehouseId: warehouse.id },
    select: { variantId: true, quantity: true },
  });
  const positiveRows = allRows.filter((row) => row.quantity !== 0);

  console.log(
    JSON.stringify(
      {
        dryRun,
        warehouse,
        before: {
          rows: before._count,
          totalQty: before._sum.quantity ?? 0,
          nonzeroRows: positiveRows.length,
        },
      },
      null,
      2,
    ),
  );

  if (allRows.length === 0) {
    console.log("Zaten boş; işlem yok.");
    return;
  }
  if (dryRun) {
    console.log("Dry-run: yazma yapılmadı.");
    return;
  }

  for (let i = 0; i < positiveRows.length; i += CHUNK) {
    const chunk = positiveRows.slice(i, i + CHUNK);
    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        await tx.stockMovement.create({
          data: {
            warehouseId: warehouse.id,
            variantId: row.variantId,
            kind: "ADJUSTMENT",
            quantity: -row.quantity,
            balanceAfter: 0,
            note,
          },
        });
      }
    });
    console.log(`adjust chunk ${Math.floor(i / CHUNK) + 1}: ${chunk.length}`);
  }

  const variantIds = [...new Set(allRows.map((row) => row.variantId))];
  const deleted = await prisma.warehouseStock.deleteMany({
    where: { warehouseId: warehouse.id },
  });
  console.log(`deleted warehouse_stocks: ${deleted.count}`);

  for (let i = 0; i < variantIds.length; i += CHUNK) {
    const chunk = variantIds.slice(i, i + CHUNK);
    await prisma.$transaction(async (tx) => {
      for (const variantId of chunk) {
        const agg = await tx.warehouseStock.aggregate({
          where: { variantId },
          _sum: { quantity: true },
        });
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stockQuantity: agg._sum.quantity ?? 0 },
        });
      }
    });
    console.log(`sync chunk ${Math.floor(i / CHUNK) + 1}: ${chunk.length}`);
  }

  const after = await prisma.warehouseStock.aggregate({
    where: { warehouseId: warehouse.id },
    _sum: { quantity: true },
    _count: true,
  });
  console.log(
    JSON.stringify(
      {
        after: { rows: after._count, totalQty: after._sum.quantity ?? 0 },
        removedRows: deleted.count,
        syncedVariants: variantIds.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
