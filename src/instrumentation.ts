export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { prisma } = await import("@/lib/prisma");
  const { kickImportWorker } = await import(
    /* webpackIgnore: true */
    "@/lib/product-import-worker"
  );

  await prisma.productImportJob.updateMany({
    where: { status: "RUNNING" },
    data: { status: "QUEUED", error: null, finishedAt: null },
  });
  kickImportWorker();
}
