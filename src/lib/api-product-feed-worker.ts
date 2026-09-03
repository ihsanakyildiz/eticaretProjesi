import "server-only";

import { yieldToEventLoop } from "@/lib/background-yield";
import { prisma } from "@/lib/prisma";
import { syncApiFeedRun } from "@/lib/api-product-feed-sync";
import {
  claimQueuedApiFeedRun,
  requeueStaleRunningApiFeedRuns,
} from "@/lib/feed-run-claim";

const STALE_MS = 2 * 60 * 60 * 1000;

const globalWorker = globalThis as unknown as {
  apiProductFeedWorkerRunning?: boolean;
};

export function kickApiFeedWorker() {
  if (globalWorker.apiProductFeedWorkerRunning) return;
  globalWorker.apiProductFeedWorkerRunning = true;
  void runApiFeedLoop().finally(() => {
    globalWorker.apiProductFeedWorkerRunning = false;
  });
}

async function enqueueDueFeeds() {
  const due = await prisma.apiProductFeed.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() },
      runs: { none: { status: { in: ["QUEUED", "RUNNING"] } } },
    },
    select: { id: true },
    take: 20,
  });
  for (const feed of due) {
    await prisma.apiProductFeedRun.create({
      data: { feedId: feed.id, status: "QUEUED" },
    });
  }
}

async function failStaleRuns() {
  const cutoff = new Date(Date.now() - STALE_MS);
  await prisma.apiProductFeedRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      message: "Senkron zaman aşımına uğradı.",
      finishedAt: new Date(),
    },
  });
}

async function runApiFeedLoop() {
  await failStaleRuns().catch(() => undefined);
  await enqueueDueFeeds().catch(() => undefined);

  while (true) {
    await requeueStaleRunningApiFeedRuns().catch(() => undefined);
    const runId = await claimQueuedApiFeedRun();
    if (!runId) return;
    await yieldToEventLoop();
    try {
      await syncApiFeedRun(runId);
    } catch (error) {
      console.error(error);
      await prisma.apiProductFeedRun
        .update({
          where: { id: runId },
          data: {
            status: "FAILED",
            message: error instanceof Error ? error.message.slice(0, 500) : "API senkronu başarısız.",
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    await enqueueDueFeeds().catch(() => undefined);
  }
}

export async function queueApiFeedRun(feedId: string) {
  const feed = await prisma.apiProductFeed.findUnique({
    where: { id: feedId },
    select: { isActive: true },
  });
  if (!feed?.isActive) return null;
  const active = await prisma.apiProductFeedRun.findFirst({
    where: { feedId, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  if (active) return active.id;
  const created = await prisma.apiProductFeedRun.create({
    data: { feedId, status: "QUEUED" },
  });
  return created.id;
}
