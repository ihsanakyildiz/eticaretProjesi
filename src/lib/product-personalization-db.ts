import "server-only";

import { randomBytes } from "node:crypto";
import { ensureProductPersonalizationSchema } from "@/lib/ensure-product-personalization-schema";
import { prisma } from "@/lib/prisma";
import {
  isProductPersonalizationKind,
  type ProductPersonalizationFieldDraft,
  type ProductPersonalizationFieldView,
  type ProductPersonalizationKindCode,
} from "@/lib/product-personalization";

function newId() {
  return randomBytes(12).toString("hex");
}

function asInt(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

export async function loadProductPersonalizationFields(
  productId: string,
): Promise<ProductPersonalizationFieldView[]> {
  await ensureProductPersonalizationSchema().catch(() => undefined);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      kind: string;
      label: string;
      required: number | boolean;
      sortOrder: number;
      maxLength: number | null;
    }>
  >`
    SELECT id, kind, label, required, sortOrder, maxLength
    FROM product_personalization_fields
    WHERE productId = ${productId}
    ORDER BY sortOrder ASC, createdAt ASC
  `.catch(() => []);

  return rows
    .filter((row) => isProductPersonalizationKind(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as ProductPersonalizationKindCode,
      label: row.label,
      required: row.required === true || row.required === 1,
      sortOrder: row.sortOrder,
      maxLength: row.maxLength,
    }));
}

export async function syncProductPersonalizationFields(
  productId: string,
  drafts: ProductPersonalizationFieldDraft[],
) {
  await ensureProductPersonalizationSchema();
  await prisma.$executeRaw`
    DELETE FROM product_personalization_fields WHERE productId = ${productId}
  `;

  let sortOrder = 0;
  for (const draft of drafts) {
    const label = draft.label.trim().slice(0, 191);
    if (!label || !isProductPersonalizationKind(draft.kind)) continue;
    const id = draft.id?.trim() || newId();
    const maxLength =
      draft.kind === "TEXT"
        ? Math.min(500, Math.max(1, Number(draft.maxLength) || 80))
        : null;
    await prisma.$executeRaw`
      INSERT INTO product_personalization_fields
        (id, productId, kind, label, required, sortOrder, maxLength, createdAt)
      VALUES
        (
          ${id},
          ${productId},
          ${draft.kind},
          ${label},
          ${draft.required !== false},
          ${sortOrder},
          ${maxLength},
          NOW(3)
        )
    `;
    sortOrder += 1;
  }
  return asInt(sortOrder);
}

export function parsePersonalizationDrafts(raw: string): ProductPersonalizationFieldDraft[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const drafts: ProductPersonalizationFieldDraft[] = [];
    parsed.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const kindRaw = String((item as { kind?: unknown }).kind ?? "").trim();
      if (!isProductPersonalizationKind(kindRaw)) return;
      const label = String((item as { label?: unknown }).label ?? "").trim();
      if (!label) return;
      const clientKey =
        String((item as { clientKey?: unknown }).clientKey ?? "").trim() || `pf-${index}`;
      const idRaw = String((item as { id?: unknown }).id ?? "").trim();
      const required = (item as { required?: unknown }).required !== false;
      const maxRaw = Number((item as { maxLength?: unknown }).maxLength);
      drafts.push({
        clientKey,
        id: idRaw || undefined,
        kind: kindRaw,
        label: label.slice(0, 191),
        required,
        maxLength: Number.isFinite(maxRaw) ? maxRaw : kindRaw === "TEXT" ? 80 : null,
      });
    });
    return drafts;
  } catch {
    return [];
  }
}
