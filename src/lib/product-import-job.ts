import "server-only";

import type { ProductImportRowKind } from "@prisma/client";
import { parseProductImportWorkbook } from "@/lib/product-import-excel";
import { parseProductUpdateWorkbook } from "@/lib/product-import-update-excel";
import { loadUpdatePreviewContext, previewUpdateRows } from "@/lib/product-import-update";
import {
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_ROWS,
  PRODUCT_IMPORT_PAGE_SIZE,
  groupImportRawRows,
  loadProductImportLookups,
  loadProductImportUniques,
  parseJobRowMeta,
  previewImportRows,
  type ProductImportFilter,
  type ProductImportJobRawPayload,
  type ProductImportJobStatus,
  type ProductImportJobSummary,
  type ProductImportPreviewRow,
} from "@/lib/product-import";

export type { ProductImportFilter, ProductImportJobSummary };
import { prisma } from "@/lib/prisma";

export type ProductImportRowPage = {
  rows: ProductImportPreviewRow[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

function kindFromStatus(status: ProductImportPreviewRow["status"]): ProductImportRowKind {
  switch (status) {
    case "ready":
      return "READY";
    case "zero_price":
      return "ZERO_PRICE";
    case "error":
      return "ERROR";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusFromKind(kind: ProductImportRowKind): ProductImportPreviewRow["status"] {
  switch (kind) {
    case "READY":
      return "ready";
    case "ZERO_PRICE":
      return "zero_price";
    case "ERROR":
      return "error";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function toSummary(job: {
  id: string;
  fileName: string;
  fileSize: number;
  status: ProductImportJobStatus;
  rowCount: number;
  readyCount: number;
  zeroPriceCount: number;
  errorCount: number;
  importedCount: number;
  failedCount: number;
  currentTitle: string | null;
  currentRow: number | null;
  error: string | null;
}): ProductImportJobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    fileSize: job.fileSize,
    rowCount: job.rowCount,
    readyCount: job.readyCount,
    zeroPriceCount: job.zeroPriceCount,
    errorCount: job.errorCount,
    importCount: job.readyCount + job.zeroPriceCount,
    status: job.status,
    importedCount: job.importedCount,
    failedCount: job.failedCount,
    currentTitle: job.currentTitle,
    currentRow: job.currentRow,
    error: job.error,
  };
}

function filterToKind(filter: ProductImportFilter): ProductImportRowKind | null {
  switch (filter) {
    case "all":
      return null;
    case "ready":
      return "READY";
    case "zero_price":
      return "ZERO_PRICE";
    case "error":
      return "ERROR";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export async function discardSettledImportJobs() {
  await prisma.productImportJob.deleteMany({
    where: { status: "COMPLETED" },
  });
}

export async function discardImportJob(jobId: string) {
  await prisma.productImportJob.deleteMany({ where: { id: jobId } });
}

export async function createImportJobFromWorkbook(file: File) {
  await prisma.productImportJob.deleteMany({
    where: { status: { in: ["PREVIEW", "COMPLETED", "FAILED"] } },
  });
  if (file.size === 0) return { error: "Excel dosyası seçin." };
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !file.type.includes("spreadsheet")) {
    return { error: "Yalnızca .xlsx dosyası yükleyebilirsiniz." };
  }
  if (file.size > PRODUCT_IMPORT_MAX_BYTES) {
    return { error: "Dosya 40 MB sınırını aşıyor." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawRows = await parseProductImportWorkbook(buffer);
  if (rawRows.length === 0) return { error: "Dosyada içe aktarılacak satır yok." };
  if (rawRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return { error: `En fazla ${PRODUCT_IMPORT_MAX_ROWS} satır yükleyebilirsiniz.` };
  }

  const lookups = await loadProductImportLookups();
  const uniques = await loadProductImportUniques();
  const groups = groupImportRawRows(rawRows);
  const preview = previewImportRows(rawRows, lookups, uniques);

  const job = await prisma.productImportJob.create({
    data: {
      fileName: file.name.slice(0, 255),
      fileSize: file.size,
      status: "PREVIEW",
      rowCount: preview.length,
      readyCount: preview.filter((row) => row.status === "ready").length,
      zeroPriceCount: preview.filter((row) => row.status === "zero_price").length,
      errorCount: preview.filter((row) => row.status === "error").length,
    },
  });

  const chunkSize = 200;
  for (let index = 0; index < preview.length; index += chunkSize) {
    const slice = preview.slice(index, index + chunkSize);
    await prisma.productImportJobRow.createMany({
      data: slice.map((row, offset) => {
        const group = groups[index + offset] ?? [{ rowNumber: row.rowNumber }];
        const payload: ProductImportJobRawPayload = {
          rows: group,
          variantSummary: row.variantSummary,
          rowLabel: row.rowLabel,
        };
        return {
          jobId: job.id,
          rowNumber: row.rowNumber,
          title: row.title.slice(0, 191),
          category: row.category.slice(0, 191),
          sku: row.sku.slice(0, 80),
          barcode: row.barcode.slice(0, 64),
          price: row.price.slice(0, 40),
          stock: row.stock.slice(0, 20),
          kind: kindFromStatus(row.status),
          work: "PENDING" as const,
          errors: row.errors.join(" ").slice(0, 1000),
          rawJson: JSON.stringify(payload),
        };
      }),
    });
  }

  const created = await prisma.productImportJob.findUniqueOrThrow({ where: { id: job.id } });
  return { job: toSummary(created) };
}

function updateJobDbError(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (text.includes("Can't reach database") || text.includes("P1001") || text.includes("P1002")) {
    return "Veritabanı kısa süre yanıt vermedi. MySQL çalışıyor olsa bile 50 bin satırlık tek sorgu onu kilitleyebilir. Birkaç saniye bekleyip tekrar deneyin.";
  }
  return error instanceof Error ? error.message : "Excel dosyası okunamadı.";
}

export async function createUpdateJobFromWorkbook(file: File) {
  if (file.size === 0) return { error: "Excel dosyası seçin." };
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !file.type.includes("spreadsheet")) {
    return { error: "Yalnızca .xlsx dosyası yükleyebilirsiniz." };
  }
  if (file.size > PRODUCT_IMPORT_MAX_BYTES) {
    return { error: "Dosya 40 MB sınırını aşıyor." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseProductUpdateWorkbook(buffer);
    if (parsed.rows.length === 0) return { error: "Dosyada güncellenecek satır yok." };
    if (parsed.rows.length > PRODUCT_IMPORT_MAX_ROWS) {
      return { error: `En fazla ${PRODUCT_IMPORT_MAX_ROWS} satır yükleyebilirsiniz.` };
    }

    await prisma.productImportJob.deleteMany({
      where: { status: { in: ["PREVIEW", "COMPLETED", "FAILED"] } },
    });

    const urlIds = parsed.rows.map((row) => Number.parseInt(row.productUrlId, 10));
    const context = await loadUpdatePreviewContext(urlIds, parsed.mode);
    const previewed = previewUpdateRows(parsed.rows, parsed.mode, context.products, context.uniques);

    const job = await prisma.productImportJob.create({
      data: {
        fileName: file.name.slice(0, 255),
        fileSize: file.size,
        status: "PREVIEW",
        rowCount: previewed.length,
        readyCount: previewed.filter((row) => row.preview.status === "ready").length,
        zeroPriceCount: 0,
        errorCount: previewed.filter((row) => row.preview.status === "error").length,
      },
    });

    const chunkSize = 400;
  for (let index = 0; index < previewed.length; index += chunkSize) {
    const slice = previewed.slice(index, index + chunkSize);
    await prisma.productImportJobRow.createMany({
      data: slice.map((item) => ({
        jobId: job.id,
        rowNumber: item.preview.rowNumber,
        title: item.preview.title.slice(0, 191),
        category: item.preview.category.slice(0, 191),
        sku: item.preview.sku.slice(0, 80),
        barcode: item.preview.barcode.slice(0, 64),
        price: item.preview.price.slice(0, 40),
        stock: item.preview.stock.slice(0, 20),
        kind: kindFromStatus(item.preview.status),
        work: "PENDING" as const,
        errors: item.preview.errors.join(" ").slice(0, 1000),
        rawJson: JSON.stringify(item.payload ?? { kind: "update", skipped: true }),
      })),
    });
  }

    const created = await prisma.productImportJob.findUniqueOrThrow({ where: { id: job.id } });
    return { job: toSummary(created) };
  } catch (error) {
    console.error(error);
    return { error: updateJobDbError(error) };
  }
}

export async function getImportJobSummary(jobId: string) {
  const job = await prisma.productImportJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  if (job.status === "COMPLETED") {
    await discardImportJob(job.id);
    return null;
  }
  return toSummary(job);
}

export async function getLatestImportJob() {
  await discardSettledImportJobs().catch(() => undefined);
  const job = await prisma.productImportJob.findFirst({
    where: { status: { in: ["PREVIEW", "QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      status: true,
      rowCount: true,
      readyCount: true,
      zeroPriceCount: true,
      errorCount: true,
      importedCount: true,
      failedCount: true,
      currentTitle: true,
      currentRow: true,
      error: true,
    },
  });
  return job ? toSummary(job) : null;
}

export async function listImportJobRows(
  jobId: string,
  filter: ProductImportFilter,
  page: number,
): Promise<ProductImportRowPage> {
  const kind = filterToKind(filter);
  const pageSize = PRODUCT_IMPORT_PAGE_SIZE;
  const safePage = Math.max(1, page);
  const where = {
    jobId,
    ...(kind ? { kind } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.productImportJobRow.count({ where }),
    prisma.productImportJobRow.findMany({
      where,
      orderBy: { rowNumber: "asc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        rowNumber: true,
        title: true,
        category: true,
        sku: true,
        barcode: true,
        price: true,
        stock: true,
        kind: true,
        errors: true,
        rawJson: true,
      },
    }),
  ]);

  return {
    page: safePage,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((row) => {
      const status = statusFromKind(row.kind);
      const meta = parseJobRowMeta(row.rawJson);
      return {
        rowNumber: row.rowNumber,
        title: row.title,
        category: row.category,
        sku: row.sku,
        barcode: row.barcode,
        price: row.price,
        discount: meta.discount,
        stock: row.stock,
        variantSummary: meta.variantSummary,
        rowLabel: meta.rowLabel || String(row.rowNumber),
        ok: status !== "error",
        zeroPrice: status === "zero_price",
        status,
        errors: row.errors ? [row.errors] : [],
      };
    }),
  };
}

export async function queueImportJob(jobId: string) {
  const job = await prisma.productImportJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, readyCount: true, zeroPriceCount: true },
  });
  if (!job) return { error: "Yükleme işi bulunamadı." };
  if (job.status === "RUNNING" || job.status === "QUEUED") {
    return { ok: true as const, jobId };
  }
  if (job.status === "COMPLETED") {
    return { error: "Bu dosya zaten yüklenmiş." };
  }
  if (job.readyCount + job.zeroPriceCount === 0) {
    return { error: "Yüklenecek geçerli ürün yok." };
  }

  await prisma.productImportJob.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      error: null,
      finishedAt: null,
    },
  });
  return { ok: true as const, jobId };
}
