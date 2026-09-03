import "server-only";

import { prisma } from "@/lib/prisma";
import { kickApiFeedWorker } from "@/lib/api-product-feed-worker";
import { kickImportWorker } from "@/lib/product-import-worker";
import { kickXmlFeedWorker } from "@/lib/xml-product-feed-worker";

export async function resumeBackgroundWorkers() {
  const now = new Date();
  const [xmlRuns, excelJobs, dueXmlFeeds, apiRuns, dueApiFeeds] = await Promise.all([
    prisma.xmlProductFeedRun.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.productImportJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.xmlProductFeed.count({
      where: { isActive: true, nextRunAt: { lte: now } },
    }),
    prisma.apiProductFeedRun.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }).catch(() => 0),
    prisma.apiProductFeed
      .count({
        where: { isActive: true, nextRunAt: { lte: now } },
      })
      .catch(() => 0),
  ]);
  if (xmlRuns > 0 || dueXmlFeeds > 0) kickXmlFeedWorker();
  if (apiRuns > 0 || dueApiFeeds > 0) kickApiFeedWorker();
  if (excelJobs > 0) kickImportWorker();
}
