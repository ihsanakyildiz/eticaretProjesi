import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { ensureStorefrontCartSchema } from "@/lib/ensure-storefront-cart-schema";
import { prisma } from "@/lib/prisma";
import type { HydratedCart } from "@/lib/checkout-types";

const COOKIE = "ia-cart-sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function newSessionKey() {
  return randomBytes(16).toString("hex");
}

async function readSessionKey() {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value?.trim();
  if (existing && existing.length >= 8 && existing.length <= 64) return existing;
  const next = newSessionKey();
  try {
    jar.set(COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  } catch {
    /* cookie may be read-only in some RSC contexts */
  }
  return next;
}

export async function syncStorefrontCartFromHydrated(cart: HydratedCart) {
  await ensureStorefrontCartSchema().catch(() => undefined);
  const sessionKey = await readSessionKey();
  const lines = cart.lines.filter(
    (line) => line.available && line.productId && line.variantId && line.quantity > 0,
  );

  try {
    await prisma.$executeRaw`
      DELETE FROM \`storefront_cart_lines\` WHERE \`sessionKey\` = ${sessionKey}
    `;
    for (const line of lines) {
      const id = newSessionKey();
      await prisma.$executeRaw`
        INSERT INTO \`storefront_cart_lines\`
          (\`id\`, \`sessionKey\`, \`productId\`, \`variantId\`, \`quantity\`, \`unitPriceMinor\`, \`updatedAt\`)
        VALUES
          (${id}, ${sessionKey}, ${line.productId}, ${line.variantId}, ${line.quantity}, ${line.unitPriceMinor}, NOW(3))
      `;
    }
  } catch (error) {
    console.error(error);
  }
}
