import "server-only";

import { prisma } from "@/lib/prisma";

const STALE_MS = 5 * 60 * 1000;

const boot = globalThis as unknown as {
  eticaretFeedInstrumentationArmed?: boolean;
};

export function isFirstFeedInstrumentationBoot() {
  if (boot.eticaretFeedInstrumentationArmed) return false;
  boot.eticaretFeedInstrumentationArmed = true;
  return true;
}

export async function requeueRunningFeedRunsOnProcessBoot() {
  if (!isFirstFeedInstrumentationBoot()) return;
  await Promise.all([
    prisma.apiProductFeedRun
      .updateMany({
        where: { status: "RUNNING" },
        data: { status: "QUEUED", finishedAt: null },
      })
      .catch(() => undefined),
    prisma.xmlProductFeedRun
      .updateMany({
        where: { status: "RUNNING" },
        data: { status: "QUEUED", finishedAt: null },
      })
      .catch(() => undefined),
  ]);
}

export async function requeueStaleRunningApiFeedRuns() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const running = await prisma.apiProductFeedRun.findMany({
    where: { status: "RUNNING" },
    select: { id: true, feed: { select: { updatedAt: true } } },
  });
  const staleIds = running.filter((run) => run.feed.updatedAt < cutoff).map((run) => run.id);
  if (staleIds.length === 0) return;
  await prisma.apiProductFeedRun.updateMany({
    where: { id: { in: staleIds } },
    data: { status: "QUEUED", finishedAt: null },
  });
}

export async function requeueStaleRunningXmlFeedRuns() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const running = await prisma.xmlProductFeedRun.findMany({
    where: { status: "RUNNING" },
    select: { id: true, feed: { select: { updatedAt: true } } },
  });
  const staleIds = running.filter((run) => run.feed.updatedAt < cutoff).map((run) => run.id);
  if (staleIds.length === 0) return;
  await prisma.xmlProductFeedRun.updateMany({
    where: { id: { in: staleIds } },
    data: { status: "QUEUED", finishedAt: null },
  });
}

export async function claimQueuedApiFeedRun() {
  const queued = await prisma.apiProductFeedRun.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!queued) return null;
  const claimed = await prisma.$executeRaw`
    UPDATE api_product_feed_runs SET status = 'RUNNING' WHERE id = ${queued.id} AND status = 'QUEUED'
  `;
  return Number(claimed) === 1 ? queued.id : null;
}

export async function claimQueuedXmlFeedRun() {
  const queued = await prisma.xmlProductFeedRun.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!queued) return null;
  const claimed = await prisma.$executeRaw`
    UPDATE xml_product_feed_runs SET status = 'RUNNING' WHERE id = ${queued.id} AND status = 'QUEUED'
  `;
  return Number(claimed) === 1 ? queued.id : null;
}
