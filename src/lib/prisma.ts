import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withPoolParams(url: string | undefined) {
  if (!url) return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=20&pool_timeout=60&connect_timeout=20`;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: withPoolParams(process.env.DATABASE_URL),
  });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  return Boolean(
    client &&
      "mailMessage" in client &&
      "shippingCarrier" in client &&
      "pageSectionProduct" in client &&
      "pageSectionProductCategory" in client &&
      "productImportJob" in client &&
      "xmlProductFeed" in client &&
      "apiProductFeed" in client &&
      "apiProductFeedRun" in client &&
      "orderRefund" in client &&
      "orderCase" in client &&
      "stockWarehouse" in client &&
      "warehouseStock" in client &&
      "stockDocument" in client &&
      "stockLocation" in client,
  );
}

function resolvePrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && hasCurrentDelegates(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = resolvePrismaClient();
