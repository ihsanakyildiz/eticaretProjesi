/**
 * Merkez (MERKEZ / varsayılan) depo stoklarını sıfırlar.
 * Satılabilir stockQuantity tüm depoların toplamına çekilir.
 * supplierStock (tedarikçi stoğu) değişmez.
 *
 * Kullanım (proje kökünde, doğru .env / DATABASE_URL ile):
 *   node scripts/zero-merkez-warehouse.js
 *
 * Dry-run (sadece sayım, yazma yok):
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
  const positiveRows = await prisma.warehouseStock.findMany({
    where: { warehouseId: warehouse.id, quantity: { not: 0 } },
    select: { variantId: true, quantity: true },
  });

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

  if (positiveRows.length === 0) {
    console.log("Zaten sıfır; işlem yok.");
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
        const next = 0;
        const delta = -row.quantity;
        await tx.warehouseStock.update({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: row.variantId,
            },
          },
          data: { quantity: next },
        });
        await tx.stockMovement.create({
          data: {
            warehouseId: warehouse.id,
            variantId: row.variantId,
            kind: "ADJUSTMENT",
            quantity: delta,
            balanceAfter: next,
            note,
          },
        });
        const agg = await tx.warehouseStock.aggregate({
          where: { variantId: row.variantId },
          _sum: { quantity: true },
        });
        await tx.productVariant.update({
          where: { id: row.variantId },
          data: { stockQuantity: agg._sum.quantity ?? 0 },
        });
      }
    });
    console.log(`chunk ${Math.floor(i / CHUNK) + 1}: ${chunk.length} varyant`);
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
        adjustedVariants: positiveRows.length,
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
