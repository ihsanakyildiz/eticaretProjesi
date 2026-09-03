import "server-only";

import { yieldToEventLoop } from "@/lib/background-yield";
import { prisma } from "@/lib/prisma";
import { syncXmlFeedRun } from "@/lib/xml-product-feed-sync";
import {
  claimQueuedXmlFeedRun,
  requeueStaleRunningXmlFeedRuns,
} from "@/lib/feed-run-claim";

const STALE_MS = 2 * 60 * 60 * 1000;

const globalWorker = globalThis as unknown as {
  xmlProductFeedWorkerRunning?: boolean;
};

export function kickXmlFeedWorker() {
  if (globalWorker.xmlProductFeedWorkerRunning) return;
  globalWorker.xmlProductFeedWorkerRunning = true;
  void runXmlFeedLoop().finally(() => {
    globalWorker.xmlProductFeedWorkerRunning = false;
  });
}

async function enqueueDueFeeds() {
  const due = await prisma.xmlProductFeed.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() },
      runs: { none: { status: { in: ["QUEUED", "RUNNING"] } } },
    },
    select: { id: true },
    take: 20,
  });
  for (const feed of due) {
    await prisma.xmlProductFeedRun.create({
      data: { feedId: feed.id, status: "QUEUED" },
    });
  }
}

async function failStaleRuns() {
  const cutoff = new Date(Date.now() - STALE_MS);
  await prisma.xmlProductFeedRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      message: "Senkron zaman aşımına uğradı.",
      finishedAt: new Date(),
    },
  });
}

async function runXmlFeedLoop() {
  await failStaleRuns().catch(() => undefined);
  await enqueueDueFeeds().catch(() => undefined);

  while (true) {
    await requeueStaleRunningXmlFeedRuns().catch(() => undefined);
    const runId = await claimQueuedXmlFeedRun();
    if (!runId) return;
    await yieldToEventLoop();
    try {
      await syncXmlFeedRun(runId);
    } catch (error) {
      console.error(error);
      await prisma.xmlProductFeedRun
        .update({
          where: { id: runId },
          data: {
            status: "FAILED",
            message: error instanceof Error ? error.message.slice(0, 500) : "XML senkronu başarısız.",
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    await enqueueDueFeeds().catch(() => undefined);
  }
}

export async function queueXmlFeedRun(feedId: string) {
  const feed = await prisma.xmlProductFeed.findUnique({
    where: { id: feedId },
    select: { isActive: true },
  });
  if (!feed?.isActive) return null;
  const active = await prisma.xmlProductFeedRun.findFirst({
    where: { feedId, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  if (active) return active.id;
  const created = await prisma.xmlProductFeedRun.create({
    data: { feedId, status: "QUEUED" },
  });
  return created.id;
}
