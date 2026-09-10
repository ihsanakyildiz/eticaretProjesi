"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { IMPORT_PATHS } from "./import-paths";
import { requirePermission } from "@/lib/staff-permissions";
import {
  emptyApiFeedForm,
  isApiFeedAuthType,
  isApiFeedHttpMethod,
  parseApiFeedRequestJson,
  type ApiFeedDiscoveredEndpoint,
  type ApiFeedFormValues,
  type ApiProductFeedSummary,
} from "@/lib/api-product-feed-shared";
import {
  countApiFeedRuns,
  getApiFeed,
  getApiFeedProgress,
  listApiFeedProgress,
  listApiFeedRuns,
  listApiFeeds,
  saveApiFeedRecord,
  toApiFeedSummary,
} from "@/lib/api-product-feed-store";
import { kickApiFeedWorker, queueApiFeedRun } from "@/lib/api-product-feed-worker";
import { discoverApiFeedSource } from "@/lib/api-feed-discover";
import { previewJsonFeed } from "@/lib/json-product-feed";
import { loadAdminImportLookups } from "./import-lookups";
import {
  isXmlFeedMatchBy,
  isXmlFeedPriceRound,
  mappingHasTarget,
  XML_FEED_RUN_PAGE_SIZE,
  type XmlFeedLiveProgress,
  type XmlFeedPreviewResult,
  type XmlProductFeedRunSummary,
} from "@/lib/xml-product-feed-shared";

async function requireFeedWrite() {
  const update = await requirePermission("products", "update");
  if (update.ok) return update;
  return requirePermission("products", "create");
}

function revalidateApiFeedPages(id?: string) {
  revalidatePath(IMPORT_PATHS.api);
  revalidatePath(IMPORT_PATHS.apiNew);
  if (id) revalidatePath(IMPORT_PATHS.apiFeed(id));
}

function asAuth(values: {
  httpMethod: ApiFeedFormValues["httpMethod"];
  authType: ApiFeedFormValues["authType"];
  httpUser?: string;
  httpPass?: string;
  request: ReturnType<typeof parseApiFeedRequestJson>;
}) {
  return {
    httpMethod: values.httpMethod,
    authType: values.authType,
    httpUser: values.httpUser,
    httpPass: values.httpPass,
    request: values.request,
  };
}

function validateForm(values: ApiFeedFormValues) {
  const name = values.name.trim();
  const url = values.url.trim();
  if (!name) return "Kaynak adı zorunludur.";
  if (!url) return "API adresi zorunludur.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "API adresi http(s) olmalıdır.";
    }
  } catch {
    return "API adresi geçersiz.";
  }
  if (!isApiFeedHttpMethod(values.httpMethod)) return "HTTP yöntemi geçersiz.";
  if (!isApiFeedAuthType(values.authType)) return "Kimlik doğrulama tipi geçersiz.";
  if (!isXmlFeedMatchBy(values.matchBy)) return "Eşleme alanı geçersiz.";
  if (!isXmlFeedPriceRound(values.priceRound)) return "Yuvarlama değeri geçersiz.";
  if ((values.authType === "HEADER" || values.authType === "QUERY") && !values.authHeader.trim()) {
    return values.authType === "HEADER" ? "Header adını yazın." : "URL parametre adını yazın.";
  }
  const hasMatch = (() => {
    switch (values.matchBy) {
      case "BARCODE":
        return mappingHasTarget(values.mapping, "barcode");
      case "SKU":
        return mappingHasTarget(values.mapping, "sku");
      case "PRODUCT_CODE":
        return mappingHasTarget(values.mapping, "productKey") || mappingHasTarget(values.mapping, "sku");
      case "PRODUCT_ID":
        return (
          mappingHasTarget(values.mapping, "externalId") ||
          mappingHasTarget(values.mapping, "productKey") ||
          mappingHasTarget(values.mapping, "sku")
        );
      default: {
        const _exhaustive: never = values.matchBy;
        return _exhaustive;
      }
    }
  })();
  if (!hasMatch) {
    switch (values.matchBy) {
      case "BARCODE":
        return "Barkod JSON alanını bir mağaza alanına eşleyin.";
      case "SKU":
        return "SKU JSON alanını bir mağaza alanına eşleyin.";
      case "PRODUCT_ID":
        return "Ürün ID JSON alanını eşleyin.";
      case "PRODUCT_CODE":
        return "Ürün kodu veya SKU JSON alanını eşleyin.";
      default: {
        const _exhaustive: never = values.matchBy;
        return _exhaustive;
      }
    }
  }
  if (values.createNew && !mappingHasTarget(values.mapping, "title")) {
    return "Yeni ürün eklemek için ürün adı alanını eşleyin.";
  }
  if (values.createNew && !mappingHasTarget(values.mapping, "category") && !values.defaultCategoryId) {
    return "Yeni ürün için kategori alanını eşleyin veya varsayılan kategori seçin.";
  }
  if (values.closeAllForSale && !values.supplierId.trim()) {
    return "Bütün ürünleri satışa kapatmak için tedarikçi seçin.";
  }
  if (values.deleteUnsold && !values.supplierId.trim()) {
    return "Satılmayan ürünleri silmek için tedarikçi seçin.";
  }
  return null;
}

export async function listApiFeedsAction(): Promise<{
  error?: string;
  feeds?: ApiProductFeedSummary[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const feeds = await listApiFeeds();
  if (feeds.some((feed) => feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date()))) {
    kickApiFeedWorker();
  }
  return { feeds };
}

export async function previewApiFeedAction(input: {
  url: string;
  httpUser?: string;
  httpPass?: string;
  keepStoredPass?: boolean;
  feedId?: string;
  itemPath?: string;
  variantPath?: string;
  mapping?: ApiFeedFormValues["mapping"];
  categoryAliases?: ApiFeedFormValues["categoryAliases"];
  brandAliases?: ApiFeedFormValues["brandAliases"];
  filterValueAliases?: ApiFeedFormValues["filterValueAliases"];
  httpMethod?: ApiFeedFormValues["httpMethod"];
  authType?: ApiFeedFormValues["authType"];
  authHeader?: string;
  extraHeaders?: string;
  requestBody?: string;
  pageParam?: string;
  pageSizeParam?: string;
  pageSize?: number;
  pageStart?: number;
  maxPages?: number;
}): Promise<{
  error?: string;
  preview?: XmlFeedPreviewResult;
  specTitle?: string;
  endpoints?: ApiFeedDiscoveredEndpoint[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const url = input.url.trim();
  if (!url) return { error: "API adresi zorunludur." };

  let httpPass = input.httpPass?.trim() || "";
  let httpUser = input.httpUser?.trim() || "";
  let storedRequest = parseApiFeedRequestJson("{}");
  if (input.feedId && (input.keepStoredPass || !httpPass || !httpUser)) {
    const stored = await prisma.apiProductFeed.findUnique({
      where: { id: input.feedId },
      select: { httpUser: true, httpPass: true, requestJson: true, httpMethod: true, authType: true },
    });
    if (stored) {
      if (!httpUser) httpUser = stored.httpUser ?? "";
      if (!httpPass && input.keepStoredPass) httpPass = stored.httpPass ?? "";
      storedRequest = parseApiFeedRequestJson(stored.requestJson);
    }
  }

  const httpMethod = input.httpMethod && isApiFeedHttpMethod(input.httpMethod) ? input.httpMethod : "GET";
  const authType = input.authType && isApiFeedAuthType(input.authType) ? input.authType : "NONE";

  try {
    const auth = asAuth({
      httpMethod,
      authType,
      httpUser,
      httpPass,
      request: {
        ...storedRequest,
        authHeader: input.authHeader ?? storedRequest.authHeader,
        extraHeaders: input.extraHeaders ?? storedRequest.extraHeaders,
        requestBody: input.requestBody ?? storedRequest.requestBody,
        pageParam: input.pageParam ?? storedRequest.pageParam,
        pageSizeParam: input.pageSizeParam ?? storedRequest.pageSizeParam,
        pageSize: input.pageSize ?? storedRequest.pageSize,
        pageStart: input.pageStart ?? storedRequest.pageStart,
        maxPages: 1,
      },
    });
    const discovered = await discoverApiFeedSource(url, auth);
    switch (discovered.kind) {
      case "openapi":
        return { specTitle: discovered.title, endpoints: discovered.endpoints };
      case "feed": {
        const { filters } = await loadAdminImportLookups();
        return {
          preview: previewJsonFeed(
            discovered.text,
            input.itemPath ?? "",
            input.mapping ?? {},
            input.categoryAliases ?? [],
            input.brandAliases ?? [],
            input.variantPath ?? "",
            input.filterValueAliases ?? {},
            filters,
          ),
        };
      }
      default: {
        const _exhaustive: never = discovered;
        return _exhaustive;
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "API okunamadı." };
  }
}

export async function saveApiFeedAction(
  values: ApiFeedFormValues,
): Promise<{ error?: string; feed?: ApiProductFeedSummary }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const merged = { ...emptyApiFeedForm(), ...values };
  const invalid = validateForm(merged);
  if (invalid) return { error: invalid };

  try {
    const existing = merged.id
      ? await prisma.apiProductFeed.findUnique({
          where: { id: merged.id },
          select: { httpPass: true },
        })
      : null;
    const saved = await saveApiFeedRecord(merged, existing?.httpPass);
    if (!merged.isActive) {
      await prisma.apiProductFeedRun.updateMany({
        where: { feedId: saved.id, status: "QUEUED" },
        data: {
          status: "COMPLETED",
          message: "Kaynak pasife alındı.",
          finishedAt: new Date(),
        },
      });
    }
    const summary = (await getApiFeed(saved.id)) ?? toApiFeedSummary(saved, false);
    kickApiFeedWorker();
    after(() => {
      kickApiFeedWorker();
    });
    revalidateApiFeedPages(summary.id);
    return { feed: summary };
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error ? error.message : "Kaynak kaydedilemedi." };
  }
}

export async function toggleApiFeedAction(
  feedId: string,
  isActive: boolean,
): Promise<{ error?: string; feeds?: ApiProductFeedSummary[] }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const feed = await prisma.apiProductFeed.findUnique({
    where: { id: feedId },
    select: { intervalMinutes: true },
  });
  if (!feed) return { error: "Kaynak bulunamadı." };
  await prisma.apiProductFeed.update({
    where: { id: feedId },
    data: {
      isActive,
      nextRunAt: isActive ? new Date() : null,
    },
  });
  if (!isActive) {
    await prisma.apiProductFeedRun.updateMany({
      where: { feedId, status: "QUEUED" },
      data: {
        status: "COMPLETED",
        message: "Kaynak pasife alındı.",
        finishedAt: new Date(),
      },
    });
  }
  if (isActive) {
    after(() => {
      kickApiFeedWorker();
    });
  }
  revalidateApiFeedPages(feedId);
  return { feeds: await listApiFeeds() };
}

export async function deleteApiFeedAction(
  feedId: string,
): Promise<{ error?: string; feeds?: ApiProductFeedSummary[] }> {
  const gate = await requirePermission("products", "delete");
  if (!gate.ok) return { error: gate.error };
  await prisma.apiProductFeed.delete({ where: { id: feedId } });
  revalidateApiFeedPages(feedId);
  return { feeds: await listApiFeeds() };
}

export async function runApiFeedAction(
  feedId: string,
): Promise<{ error?: string; feed?: ApiProductFeedSummary }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const exists = await prisma.apiProductFeed.findUnique({
    where: { id: feedId },
    select: { id: true, isActive: true },
  });
  if (!exists) return { error: "Kaynak bulunamadı." };
  if (!exists.isActive) return { error: "Pasif kaynak çalıştırılamaz. Önce aktif edin." };
  await queueApiFeedRun(feedId);
  kickApiFeedWorker();
  after(() => {
    kickApiFeedWorker();
  });
  const feed = await getApiFeed(feedId);
  revalidateApiFeedPages(feedId);
  return feed ? { feed } : { error: "Kaynak bulunamadı." };
}

export async function listApiFeedProgressAction(): Promise<{
  error?: string;
  progress?: XmlFeedLiveProgress[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  return { progress: await listApiFeedProgress() };
}

export async function getApiFeedProgressAction(feedId: string): Promise<{
  error?: string;
  progress?: XmlFeedLiveProgress;
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const progress = await getApiFeedProgress(feedId);
  return progress ? { progress } : { error: "Kaynak bulunamadı." };
}

export async function getApiFeedAction(feedId: string) {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const feed = await getApiFeed(feedId);
  if (feed?.running) kickApiFeedWorker();
  return feed ? { feed } : { error: "Kaynak bulunamadı." };
}

export async function listApiFeedRunsAction(
  feedId: string,
  page = 1,
): Promise<{
  error?: string;
  runs?: XmlProductFeedRunSummary[];
  total?: number;
  page?: number;
  pageSize?: number;
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const exists = await prisma.apiProductFeed.findUnique({
    where: { id: feedId },
    select: { id: true },
  });
  if (!exists) return { error: "Kaynak bulunamadı." };
  const pageSize = XML_FEED_RUN_PAGE_SIZE;
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [total, runs] = await Promise.all([
    countApiFeedRuns(feedId),
    listApiFeedRuns(feedId, pageSize, (safePage - 1) * pageSize),
  ]);
  return { runs, total, page: safePage, pageSize };
}
