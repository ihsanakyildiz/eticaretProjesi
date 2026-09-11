import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Paylaşımlı MySQL kotası (max_user_connections) için küçük havuz. */
const BUILD_CONNECTION_LIMIT = 2;
const RUNTIME_CONNECTION_LIMIT = 5;

function defaultConnectionLimit() {
  const fromEnv = Number.parseInt(process.env.PRISMA_CONNECTION_LIMIT ?? "", 10);
  if (Number.isFinite(fromEnv) && fromEnv >= 1 && fromEnv <= 20) {
    return Math.round(fromEnv);
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return BUILD_CONNECTION_LIMIT;
  }
  return RUNTIME_CONNECTION_LIMIT;
}

function withPoolParams(url: string | undefined) {
  if (!url) return url;
  if (!/^mysqls?:\/\//i.test(url)) return url;

  const extras: string[] = [];
  if (!/[?&]connection_limit=/.test(url)) {
    extras.push(`connection_limit=${defaultConnectionLimit()}`);
  }
  if (!/[?&]pool_timeout=/.test(url)) {
    extras.push("pool_timeout=60");
  }
  if (!/[?&]connect_timeout=/.test(url)) {
    extras.push("connect_timeout=20");
  }
  if (extras.length === 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${extras.join("&")}`;
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
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = resolvePrismaClient();
