import "server-only";

import type { XmlFeedMatchBy, XmlFeedPriceRound, XmlFeedRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isXmlFeedMatchBy,
  isXmlFeedPriceRound,
  isXmlFeedRunStatus,
  flagsFromUpdateFields,
  parseXmlFeedMapping,
  parseXmlFeedValueMaps,
  serializeXmlFeedMapping,
  serializeXmlFeedValueMaps,
  updateFieldsFromFlags,
  XML_FEED_RUN_PAGE_SIZE,
  type XmlFeedFormValues,
  type XmlFeedLiveProgress,
  type XmlProductFeedRunSummary,
  type XmlProductFeedSummary,
} from "@/lib/xml-product-feed-shared";

type FeedRecord = Awaited<ReturnType<typeof prisma.xmlProductFeed.findMany>>[number];
type RunRecord = Awaited<ReturnType<typeof prisma.xmlProductFeedRun.findMany>>[number];

function asMatchBy(value: XmlFeedMatchBy): XmlProductFeedSummary["matchBy"] {
  return isXmlFeedMatchBy(value) ? value : "BARCODE";
}

function asPriceRound(value: XmlFeedPriceRound): XmlProductFeedSummary["priceRound"] {
  return isXmlFeedPriceRound(value) ? value : "NONE";
}

function asRunStatus(value: XmlFeedRunStatus): XmlProductFeedRunSummary["status"] {
  return isXmlFeedRunStatus(value) ? value : "QUEUED";
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function asCursor(value: unknown) {
  const cursor = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(cursor) || cursor < 0) return 0;
  return Math.floor(cursor);
}

function toIsoFromUnknown(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toRunSummary(run: RunRecord): XmlProductFeedRunSummary {
  const row = run as RunRecord & { cursor?: unknown };
  return {
    id: run.id,
    status: asRunStatus(run.status),
    itemCount: run.itemCount,
    createdCount: run.createdCount,
    updatedCount: run.updatedCount,
    skippedCount: run.skippedCount,
    failedCount: run.failedCount,
    deactivatedCount: run.deactivatedCount,
    cursor: asCursor(row.cursor),
    message: run.message ?? null,
    startedAt: toIso(run.startedAt),
    finishedAt: toIso(run.finishedAt),
    createdAt: run.createdAt.toISOString(),
  };
}

type SqlRunRow = {
  id: string;
  status: string;
  itemCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  deactivatedCount: number;
  resumeAt: number;
  message: string | null;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
  createdAt: Date | string;
};

function mapSqlRunRow(row: SqlRunRow): XmlProductFeedRunSummary {
  return {
    id: row.id,
    status: asRunStatus(row.status as RunRecord["status"]),
    itemCount: Number(row.itemCount) || 0,
    createdCount: Number(row.createdCount) || 0,
    updatedCount: Number(row.updatedCount) || 0,
    skippedCount: Number(row.skippedCount) || 0,
    failedCount: Number(row.failedCount) || 0,
    deactivatedCount: Number(row.deactivatedCount) || 0,
    cursor: asCursor(row.resumeAt),
    message: row.message ?? null,
    startedAt: toIsoFromUnknown(row.startedAt),
    finishedAt: toIsoFromUnknown(row.finishedAt),
    createdAt: toIsoFromUnknown(row.createdAt) ?? new Date().toISOString(),
  };
}

export async function listXmlFeedRuns(
  feedId: string,
  take = XML_FEED_RUN_PAGE_SIZE,
  skip = 0,
): Promise<XmlProductFeedRunSummary[]> {
  const limit = Math.min(50, Math.max(1, Math.floor(take)));
  const offset = Math.max(0, Math.floor(skip));
  const rows = await prisma.$queryRawUnsafe<SqlRunRow[]>(
    `SELECT id, status, itemCount, createdCount, updatedCount, skippedCount, failedCount,
            deactivatedCount, \`cursor\` AS resumeAt, message, startedAt, finishedAt, createdAt
     FROM xml_product_feed_runs
     WHERE feedId = ?
     ORDER BY COALESCE(startedAt, createdAt) DESC, createdAt DESC
     LIMIT ${limit} OFFSET ${offset}`,
    feedId,
  );
  return rows.map(mapSqlRunRow);
}

export async function countXmlFeedRuns(feedId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ total: number | bigint }>>(
    "SELECT COUNT(*) AS total FROM xml_product_feed_runs WHERE feedId = ?",
    feedId,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function listXmlFeedActiveRuns() {
  return prisma.$queryRawUnsafe<Array<{ feedId: string; resumeAt: number; itemCount: number }>>(
    `SELECT feedId, \`cursor\` AS resumeAt, itemCount
     FROM xml_product_feed_runs
     WHERE status IN ('QUEUED','RUNNING')`,
  );
}

export function toFeedSummary(
  feed: FeedRecord & {
    supplier?: { name: string } | null;
    runs?: RunRecord[];
  },
  running: boolean,
  recentRuns?: XmlProductFeedRunSummary[],
  progress?: { cursor: number; itemCount: number },
): XmlProductFeedSummary {
  const valueMaps = parseXmlFeedValueMaps(feed.categoryMapJson);
  const runs = recentRuns ?? [];
  const active = runs.find((run) => run.status === "QUEUED" || run.status === "RUNNING");
  return {
    id: feed.id,
    name: feed.name,
    url: feed.url,
    isActive: feed.isActive,
    supplierId: feed.supplierId,
    supplierName: feed.supplier?.name ?? null,
    defaultCategoryId: feed.defaultCategoryId,
    defaultBrandId: feed.defaultBrandId,
    itemPath: feed.itemPath,
    variantPath: valueMaps.variantPath,
    mapping: parseXmlFeedMapping(feed.mappingJson),
    categoryAliases: valueMaps.categories,
    brandAliases: valueMaps.brands,
    discovery: valueMaps.discovery,
    matchBy: asMatchBy(feed.matchBy),
    skuPrefix: feed.skuPrefix,
    httpUser: feed.httpUser,
    hasHttpPass: Boolean(feed.httpPass),
    createNew: feed.createNew,
    updateFields:
      valueMaps.updateFields ??
      updateFieldsFromFlags({
        updatePrice: feed.updatePrice,
        updateStock: feed.updateStock,
        updateImages: feed.updateImages,
        updateContent: feed.updateContent,
        updateTitle: feed.updateTitle,
      }),
    updatePrice: feed.updatePrice,
    updateStock: feed.updateStock,
    updateImages: feed.updateImages,
    updateContent: feed.updateContent,
    updateTitle: feed.updateTitle,
    deactivateMissing: feed.deactivateMissing,
    stockLimit: valueMaps.stockLimit,
    outOfStockBehavior: valueMaps.outOfStockBehavior,
    closeAllForSale: valueMaps.closeAllForSale,
    closeZeroStock: valueMaps.closeZeroStock,
    deleteUnsold: valueMaps.deleteUnsold,
    priceIncludesTax: feed.priceIncludesTax,
    priceMarkupPercent: feed.priceMarkupPercent.toString(),
    priceRound: asPriceRound(feed.priceRound),
    intervalMinutes: feed.intervalMinutes,
    lastRunAt: toIso(feed.lastRunAt),
    nextRunAt: toIso(feed.nextRunAt),
    lastStatus: feed.lastStatus,
    lastMessage: feed.lastMessage,
    lastCreatedCount: feed.lastCreatedCount,
    lastUpdatedCount: feed.lastUpdatedCount,
    lastSkippedCount: feed.lastSkippedCount,
    lastFailedCount: feed.lastFailedCount,
    running,
    runningCursor: progress?.cursor ?? active?.cursor ?? 0,
    runningItemCount: progress?.itemCount ?? active?.itemCount ?? 0,
    recentRuns: runs,
  };
}

const feedInclude = {
  supplier: { select: { name: true } },
};

function progressFromActive(active: { resumeAt: number; itemCount: number } | undefined) {
  return {
    cursor: asCursor(active?.resumeAt),
    itemCount: Number(active?.itemCount) || 0,
  };
}

export async function listXmlFeeds(): Promise<XmlProductFeedSummary[]> {
  const [feeds, activeRuns] = await Promise.all([
    prisma.xmlProductFeed.findMany({
      include: feedInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    listXmlFeedActiveRuns(),
  ]);
  const activeByFeed = new Map(activeRuns.map((run) => [run.feedId, run]));
  return feeds.map((feed) => {
    const active = activeByFeed.get(feed.id);
    return toFeedSummary(feed, Boolean(active), [], progressFromActive(active));
  });
}

export async function listXmlFeedProgress(): Promise<XmlFeedLiveProgress[]> {
  const [feeds, activeRuns] = await Promise.all([
    prisma.xmlProductFeed.findMany({
      select: {
        id: true,
        lastStatus: true,
        lastMessage: true,
        lastCreatedCount: true,
        lastUpdatedCount: true,
        lastSkippedCount: true,
        lastFailedCount: true,
      },
    }),
    listXmlFeedActiveRuns(),
  ]);
  const activeByFeed = new Map(activeRuns.map((run) => [run.feedId, run]));
  return feeds.map((feed) => {
    const active = activeByFeed.get(feed.id);
    return {
      id: feed.id,
      running: Boolean(active),
      lastStatus: feed.lastStatus,
      lastMessage: feed.lastMessage,
      lastCreatedCount: feed.lastCreatedCount,
      lastUpdatedCount: feed.lastUpdatedCount,
      lastSkippedCount: feed.lastSkippedCount,
      lastFailedCount: feed.lastFailedCount,
      runningCursor: progressFromActive(active).cursor,
      runningItemCount: progressFromActive(active).itemCount,
    };
  });
}

export async function getXmlFeedProgress(id: string): Promise<XmlFeedLiveProgress | null> {
  const rows = await listXmlFeedProgress();
  return rows.find((row) => row.id === id) ?? null;
}

export async function getXmlFeed(id: string) {
  const [feed, activeRuns] = await Promise.all([
    prisma.xmlProductFeed.findUnique({
      where: { id },
      include: { supplier: { select: { name: true } } },
    }),
    listXmlFeedActiveRuns(),
  ]);
  if (!feed) return null;
  const active = activeRuns.find((run) => run.feedId === id);
  return toFeedSummary(feed, Boolean(active), [], progressFromActive(active));
}

export function computeNextRunAt(intervalMinutes: number, from = new Date()) {
  const minutes = Math.min(10080, Math.max(5, intervalMinutes));
  return new Date(from.getTime() + minutes * 60_000);
}

export async function saveXmlFeedRecord(values: XmlFeedFormValues, existingPass?: string | null) {
  const intervalMinutes = Math.min(10080, Math.max(5, Math.round(values.intervalMinutes) || 60));
  const markup = Number(String(values.priceMarkupPercent).replace(",", "."));
  const data = {
    name: values.name.trim().slice(0, 191),
    url: values.url.trim().slice(0, 1000),
    isActive: values.isActive,
    supplierId: values.supplierId.trim() || null,
    defaultCategoryId: values.defaultCategoryId.trim() || null,
    defaultBrandId: values.defaultBrandId.trim() || null,
    itemPath: values.itemPath.trim().slice(0, 500),
    mappingJson: serializeXmlFeedMapping(values.mapping),
    categoryMapJson: serializeXmlFeedValueMaps(
      values.categoryAliases,
      values.brandAliases,
      values.updateFields,
      values.discovery,
      values.stockLimit,
      values.outOfStockBehavior,
      {
        closeAllForSale: values.closeAllForSale,
        closeZeroStock: values.closeZeroStock,
        deleteUnsold: values.deleteUnsold,
      },
      values.variantPath,
    ),
    matchBy: values.matchBy,
    skuPrefix: values.skuPrefix.trim().slice(0, 40),
    httpUser: values.httpUser.trim() || null,
    httpPass: values.httpPass.trim() ? values.httpPass : (existingPass ?? null),
    createNew: values.createNew,
    ...flagsFromUpdateFields(values.updateFields),
    deactivateMissing: values.deactivateMissing,
    priceIncludesTax: values.priceIncludesTax,
    priceMarkupPercent: Number.isFinite(markup) ? markup : 0,
    priceRound: values.priceRound,
    intervalMinutes,
    nextRunAt: values.isActive ? computeNextRunAt(intervalMinutes) : null,
  };

  if (values.id) {
    return prisma.xmlProductFeed.update({
      where: { id: values.id },
      data,
      include: feedInclude,
    });
  }

  const last = await prisma.xmlProductFeed.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return prisma.xmlProductFeed.create({
    data: {
      ...data,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    include: feedInclude,
  });
}
