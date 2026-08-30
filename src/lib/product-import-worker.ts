import "server-only";

import { bustCatalogCache } from "@/lib/catalog-products";
import {
  buildImportGroup,
  createProductImportUsed,
  ensureImportAttributeValues,
  hydrateProductImportUsed,
  insertImportedProducts,
  loadProductImportLookups,
  parseJobRowRawJson,
  prepareImportedProduct,
  type PreparedImportedProduct,
  type ProductImportDraft,
} from "@/lib/product-import";
import {
  createImportImageCache,
  localizeImportedProductImagesBatch,
} from "@/lib/product-import-images";
import { discardImportJob, discardSettledImportJobs } from "@/lib/product-import-job";
import { prisma } from "@/lib/prisma";

const WRITE_BATCH = 80;

const globalWorker = globalThis as unknown as {
  productImportWorkerRunning?: boolean;
};

export function kickImportWorker() {
  if (globalWorker.productImportWorkerRunning) return;
  globalWorker.productImportWorkerRunning = true;
  void runImportLoop().finally(() => {
    globalWorker.productImportWorkerRunning = false;
  });
}

async function runImportLoop() {
  await discardSettledImportJobs().catch(() => undefined);
  while (true) {
    const job = await prisma.productImportJob.findFirst({
      where: { status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!job) return;
    await processImportJob(job.id);
  }
}

async function processImportJob(jobId: string) {
  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      error: null,
    },
  });

  const catalog = await loadLookupsAndUsed();
  const { used } = catalog;
  const imageCache = createImportImageCache();
  const last = await prisma.product.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let sortOrder = (last?.sortOrder ?? -1) + 1;
  let importedAny = false;

  try {
    while (true) {
      const rows = await prisma.productImportJobRow.findMany({
        where: {
          jobId,
          work: "PENDING",
          kind: { in: ["READY", "ZERO_PRICE"] },
        },
        orderBy: { rowNumber: "asc" },
        take: WRITE_BATCH,
      });
      if (rows.length === 0) break;

      await prisma.productImportJob.update({
        where: { id: jobId },
        data: {
          currentTitle: `Toplu kaydediliyor (${rows.length} ürün)`,
          currentRow: rows[0].rowNumber,
        },
      });

      const failed: Array<{ id: string; errors: string }> = [];
      const ready: Array<{
        rowId: string;
        rowNumber: number;
        title: string;
        draft: ProductImportDraft;
      }> = [];

      for (const row of rows) {
        let rawRows;
        try {
          rawRows = parseJobRowRawJson(row.rawJson);
        } catch {
          failed.push({ id: row.id, errors: "Bu satır kaydedilirken bir hata oluştu." });
          continue;
        }

        const { draft, errors } = buildImportGroup(rawRows, catalog.lookups);
        if (!draft) {
          failed.push({ id: row.id, errors: errors.join(" ").slice(0, 1000) });
          continue;
        }
        ready.push({
          rowId: row.id,
          rowNumber: row.rowNumber,
          title: row.title || `Satır ${row.rowNumber}`,
          draft,
        });
      }

      const localized = ready.length
        ? await localizeImportedProductImagesBatch(
            ready.map((item) => item.draft),
            imageCache,
          )
        : [];

      const toInsert: Array<{
        rowId: string;
        rowNumber: number;
        title: string;
        prepared: PreparedImportedProduct;
      }> = [];

      const acceptedDrafts: ProductImportDraft[] = [];
      const acceptedMeta: Array<{ rowId: string; rowNumber: number; title: string }> = [];
      localized.forEach((result, index) => {
        const meta = ready[index];
        if ("error" in result) {
          failed.push({ id: meta.rowId, errors: result.error.slice(0, 1000) });
          return;
        }
        acceptedDrafts.push(result.draft);
        acceptedMeta.push(meta);
      });

      if (acceptedDrafts.length > 0) {
        await ensureImportAttributeValues(acceptedDrafts, used);
        for (const [index, draft] of acceptedDrafts.entries()) {
          const meta = acceptedMeta[index];
          toInsert.push({
            rowId: meta.rowId,
            rowNumber: meta.rowNumber,
            title: meta.title,
            prepared: prepareImportedProduct(draft, used, sortOrder),
          });
          sortOrder += 1;
        }
      }

      if (toInsert.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            await insertImportedProducts(
              toInsert.map((item) => item.prepared),
              tx,
            );
            await Promise.all(
              toInsert.map((item) =>
                tx.productImportJobRow.update({
                  where: { id: item.rowId },
                  data: {
                    work: "IMPORTED",
                    productId: item.prepared.productId,
                    rawJson: "{}",
                  },
                }),
              ),
            );
            await tx.productImportJob.update({
              where: { id: jobId },
              data: {
                importedCount: { increment: toInsert.length },
                currentTitle: toInsert[toInsert.length - 1]?.title ?? "Toplu yükleme",
                currentRow: toInsert[toInsert.length - 1]?.rowNumber ?? null,
              },
            });
          },
          { timeout: 120000, maxWait: 20000 },
        );
        importedAny = true;
      }

      if (failed.length > 0) {
        await markRowsFailed(jobId, failed);
      }
    }

    if (importedAny) {
      bustCatalogCache();
    }
    await discardImportJob(jobId);
  } catch (error) {
    console.error(error);
    await prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: "Yükleme sırasında bir hata oluştu. Sayfayı açınca kaldığı yerden devam eder.",
        finishedAt: new Date(),
      },
    });
  }
}

async function loadLookupsAndUsed() {
  const lookups = await loadProductImportLookups();
  const used = createProductImportUsed(lookups);
  await hydrateProductImportUsed(used);
  return { lookups, used };
}

async function markRowsFailed(jobId: string, items: Array<{ id: string; errors: string }>) {
  if (items.length === 0) return;
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      items.map((item) =>
        tx.productImportJobRow.update({
          where: { id: item.id },
          data: { work: "FAILED", errors: item.errors.slice(0, 1000) },
        }),
      ),
    );
    await tx.productImportJob.update({
      where: { id: jobId },
      data: { failedCount: { increment: items.length } },
    });
  });
}
