export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Worker sharp/dns içerir; webpackIgnore + @/ takma adı Node’da çözülmez
  // ve sunucuyu düşürür. Kuyruk burada toparlanır; worker admin içe aktarma
  // sayfasından veya yükleme action’ından başlar.
  const { prisma } = await import("@/lib/prisma");
  const { requeueRunningFeedRunsOnProcessBoot } = await import("@/lib/feed-run-claim");
  await prisma.productImportJob.updateMany({
    where: { status: "RUNNING" },
    data: { status: "QUEUED", error: null, finishedAt: null },
  });
  await requeueRunningFeedRunsOnProcessBoot();

  const secret = process.env.CRON_SECRET?.trim();
  const headers: Record<string, string> = secret ? { authorization: `Bearer ${secret}` } : {};
  const ports = [...new Set([process.env.PORT?.trim(), "3000", "3001"].filter(Boolean))];
  setTimeout(() => {
    void (async () => {
      for (const port of ports) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/cron/xml-feeds`, {
            headers,
            cache: "no-store",
          });
          if (response.ok) return;
        } catch {
          /* diğer port */
        }
      }
    })();
  }, 4000);
}
