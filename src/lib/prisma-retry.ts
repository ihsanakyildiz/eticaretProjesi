import { Prisma } from "@prisma/client";
import { yieldToEventLoop } from "@/lib/background-yield";

export function isRetryablePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
      case "P1002":
      case "P1008":
      case "P1017":
      case "P2024":
      case "P2034":
        return true;
      default:
        return false;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return /Timed out fetching a new connection|Server has closed the connection|Connection reset|Can't reach database|Lock wait timeout|Deadlock found|P2024|P2034/i.test(
    message,
  );
}

export function isPrismaUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function withPrismaRetry<T>(work: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      last = error;
      if (!isRetryablePrismaError(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      await yieldToEventLoop();
    }
  }
  throw last;
}
