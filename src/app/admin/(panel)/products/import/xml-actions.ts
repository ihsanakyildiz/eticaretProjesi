"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { IMPORT_PATHS } from "./import-paths";
import { requirePermission } from "@/lib/staff-permissions";
import { previewXmlFeed } from "@/lib/xml-product-feed";
import { fetchXmlFeedText } from "@/lib/xml-product-feed-fetch";
import {
  emptyXmlFeedForm,
  isXmlFeedMatchBy,
  isXmlFeedPriceRound,
  mappingHasTarget,
  XML_FEED_RUN_PAGE_SIZE,
  type XmlFeedFormValues,
  type XmlFeedLiveProgress,
  type XmlFeedPreviewResult,
  type XmlProductFeedRunSummary,
  type XmlProductFeedSummary,
} from "@/lib/xml-product-feed-shared";
import {
  countXmlFeedRuns,
  getXmlFeed,
  getXmlFeedProgress,
  listXmlFeedProgress,
  listXmlFeedRuns,
  listXmlFeeds,
  saveXmlFeedRecord,
  toFeedSummary,
} from "@/lib/xml-product-feed-store";
import { kickXmlFeedWorker, queueXmlFeedRun } from "@/lib/xml-product-feed-worker";

async function requireFeedWrite() {
  const update = await requirePermission("products", "update");
  if (update.ok) return update;
  return requirePermission("products", "create");
}

function revalidateXmlFeedPages(id?: string) {
  revalidatePath(IMPORT_PATHS.xml);
  revalidatePath(IMPORT_PATHS.xmlNew);
  if (id) revalidatePath(IMPORT_PATHS.xmlFeed(id));
}

function validateForm(values: XmlFeedFormValues) {
  const name = values.name.trim();
  const url = values.url.trim();
  if (!name) return "Kaynak adı zorunludur.";
  if (!url) return "XML adresi zorunludur.";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "XML adresi http(s) olmalıdır.";
    }
  } catch {
    return "XML adresi geçersiz.";
  }
  if (!isXmlFeedMatchBy(values.matchBy)) return "Eşleme alanı geçersiz.";
  if (!isXmlFeedPriceRound(values.priceRound)) return "Yuvarlama değeri geçersiz.";
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
        return "Barkod XML etiketini bir mağaza alanına eşleyin.";
      case "SKU":
        return "SKU XML etiketini bir mağaza alanına eşleyin.";
      case "PRODUCT_ID":
        return "product_Id etiketini Ürün ID alanına eşleyin.";
      case "PRODUCT_CODE":
        return "Ürün kodu veya SKU XML etiketini eşleyin.";
      default: {
        const _exhaustive: never = values.matchBy;
        return _exhaustive;
      }
    }
  }
  if (values.createNew && !mappingHasTarget(values.mapping, "title")) {
    return "Yeni ürün eklemek için ürün adı etiketini eşleyin.";
  }
  if (values.createNew && !mappingHasTarget(values.mapping, "category") && !values.defaultCategoryId) {
    return "Yeni ürün için kategori etiketini eşleyin veya varsayılan kategori seçin.";
  }
  if (values.closeAllForSale && !values.supplierId.trim()) {
    return "Bütün ürünleri satışa kapatmak için tedarikçi seçin.";
  }
  if (values.deleteUnsold && !values.supplierId.trim()) {
    return "Satılmayan ürünleri silmek için tedarikçi seçin.";
  }
  return null;
}

export async function listXmlFeedsAction(): Promise<{
  error?: string;
  feeds?: XmlProductFeedSummary[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const feeds = await listXmlFeeds();
  if (feeds.some((feed) => feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date()))) {
    kickXmlFeedWorker();
  }
  return { feeds };
}

export async function previewXmlFeedAction(input: {
  url: string;
  httpUser?: string;
  httpPass?: string;
  keepStoredPass?: boolean;
  feedId?: string;
  itemPath?: string;
  variantPath?: string;
  mapping?: XmlFeedFormValues["mapping"];
  categoryAliases?: XmlFeedFormValues["categoryAliases"];
  brandAliases?: XmlFeedFormValues["brandAliases"];
}): Promise<{ error?: string; preview?: XmlFeedPreviewResult }> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const url = input.url.trim();
  if (!url) return { error: "XML adresi zorunludur." };

  let httpPass = input.httpPass?.trim() || "";
  let httpUser = input.httpUser?.trim() || "";
  if (input.feedId && (input.keepStoredPass || !httpPass || !httpUser)) {
    const stored = await prisma.xmlProductFeed.findUnique({
      where: { id: input.feedId },
      select: { httpUser: true, httpPass: true },
    });
    if (stored) {
      if (!httpUser) httpUser = stored.httpUser ?? "";
      if (!httpPass && input.keepStoredPass) httpPass = stored.httpPass ?? "";
    }
  }

  try {
    const xml = await fetchXmlFeedText(url, httpUser || null, httpPass || null);
    return {
      preview: previewXmlFeed(
        xml,
        input.itemPath ?? "",
        input.mapping ?? {},
        input.categoryAliases ?? [],
        input.brandAliases ?? [],
        input.variantPath ?? "",
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "XML okunamadı." };
  }
}

export async function saveXmlFeedAction(
  values: XmlFeedFormValues,
): Promise<{ error?: string; feed?: XmlProductFeedSummary }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const merged = { ...emptyXmlFeedForm(), ...values };
  const invalid = validateForm(merged);
  if (invalid) return { error: invalid };

  try {
    const existing = merged.id
      ? await prisma.xmlProductFeed.findUnique({
          where: { id: merged.id },
          select: { httpPass: true },
        })
      : null;
    const saved = await saveXmlFeedRecord(merged, existing?.httpPass);
    if (!merged.isActive) {
      await prisma.xmlProductFeedRun.updateMany({
        where: { feedId: saved.id, status: "QUEUED" },
        data: {
          status: "COMPLETED",
          message: "Kaynak pasife alındı.",
          finishedAt: new Date(),
        },
      });
    }
    const summary = (await getXmlFeed(saved.id)) ?? toFeedSummary(saved, false);
    kickXmlFeedWorker();
    after(() => {
      kickXmlFeedWorker();
    });
    revalidateXmlFeedPages(summary.id);
    return { feed: summary };
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error ? error.message : "Kaynak kaydedilemedi." };
  }
}

export async function toggleXmlFeedAction(
  feedId: string,
  isActive: boolean,
): Promise<{ error?: string; feeds?: XmlProductFeedSummary[] }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const feed = await prisma.xmlProductFeed.findUnique({
    where: { id: feedId },
    select: { intervalMinutes: true },
  });
  if (!feed) return { error: "Kaynak bulunamadı." };
  await prisma.xmlProductFeed.update({
    where: { id: feedId },
    data: {
      isActive,
      nextRunAt: isActive ? new Date() : null,
    },
  });
  if (!isActive) {
    await prisma.xmlProductFeedRun.updateMany({
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
      kickXmlFeedWorker();
    });
  }
  revalidateXmlFeedPages(feedId);
  return { feeds: await listXmlFeeds() };
}

export async function deleteXmlFeedAction(
  feedId: string,
): Promise<{ error?: string; feeds?: XmlProductFeedSummary[] }> {
  const gate = await requirePermission("products", "delete");
  if (!gate.ok) return { error: gate.error };
  await prisma.xmlProductFeed.delete({ where: { id: feedId } });
  revalidateXmlFeedPages(feedId);
  return { feeds: await listXmlFeeds() };
}

export async function runXmlFeedAction(
  feedId: string,
): Promise<{ error?: string; feed?: XmlProductFeedSummary }> {
  const gate = await requireFeedWrite();
  if (!gate.ok) return { error: gate.error };
  const exists = await prisma.xmlProductFeed.findUnique({
    where: { id: feedId },
    select: { id: true, isActive: true },
  });
  if (!exists) return { error: "Kaynak bulunamadı." };
  if (!exists.isActive) return { error: "Pasif kaynak çalıştırılamaz. Önce aktif edin." };
  await queueXmlFeedRun(feedId);
  kickXmlFeedWorker();
  after(() => {
    kickXmlFeedWorker();
  });
  const feed = await getXmlFeed(feedId);
  revalidateXmlFeedPages(feedId);
  return feed ? { feed } : { error: "Kaynak bulunamadı." };
}

export async function listXmlFeedProgressAction(): Promise<{
  error?: string;
  progress?: XmlFeedLiveProgress[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  return { progress: await listXmlFeedProgress() };
}

export async function getXmlFeedProgressAction(feedId: string): Promise<{
  error?: string;
  progress?: XmlFeedLiveProgress;
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const progress = await getXmlFeedProgress(feedId);
  return progress ? { progress } : { error: "Kaynak bulunamadı." };
}

export async function getXmlFeedAction(feedId: string) {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const feed = await getXmlFeed(feedId);
  if (feed?.running) kickXmlFeedWorker();
  return feed ? { feed } : { error: "Kaynak bulunamadı." };
}

export async function listXmlFeedRunsAction(
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
  const exists = await prisma.xmlProductFeed.findUnique({
    where: { id: feedId },
    select: { id: true },
  });
  if (!exists) return { error: "Kaynak bulunamadı." };
  const pageSize = XML_FEED_RUN_PAGE_SIZE;
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [total, runs] = await Promise.all([
    countXmlFeedRuns(feedId),
    listXmlFeedRuns(feedId, pageSize, (safePage - 1) * pageSize),
  ]);
  return { runs, total, page: safePage, pageSize };
}
