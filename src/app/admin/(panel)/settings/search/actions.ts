"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import { ensureSearchTermsTable } from "@/lib/ensure-search-schema";
import { prisma } from "@/lib/prisma";
import { displaySearchTerm, normalizeSearchTerm } from "@/lib/search-suggest-types";

export type SearchTermFormState = {
  success?: boolean;
  error?: string;
};

const SEARCH_SETTINGS_PATH = "/admin/settings/search";

function clampScore(raw: string) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(99999, Math.max(-9999, parsed));
}

export async function createSearchTermAction(
  _prev: SearchTermFormState,
  formData: FormData,
): Promise<SearchTermFormState> {
  const gate = await requirePermission("settings_search", "create");
  if (!gate.ok) return { error: gate.error };

  const display = displaySearchTerm(String(formData.get("displayTerm") ?? ""));
  const term = normalizeSearchTerm(display);
  const score = clampScore(String(formData.get("score") ?? "10"));
  if (term.length < 2) return { error: "En az 2 karakterlik bir arama terimi yazın." };

  await ensureSearchTermsTable().catch(() => undefined);
  try {
    await prisma.searchTerm.upsert({
      where: { term },
      create: { term, displayTerm: display, score, isActive: true },
      update: { displayTerm: display, score, isActive: true },
    });
  } catch (error) {
    console.error(error);
    return { error: "Terim kaydedilemedi." };
  }

  revalidatePath(SEARCH_SETTINGS_PATH);
  return { success: true };
}

export async function updateSearchTermScoreAction(formData: FormData) {
  const gate = await requirePermission("settings_search", "update");
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "").trim();
  const score = clampScore(String(formData.get("score") ?? "0"));
  if (!id) return;

  await ensureSearchTermsTable().catch(() => undefined);
  await prisma.searchTerm.update({ where: { id }, data: { score } });
  revalidatePath(SEARCH_SETTINGS_PATH);
}

export async function toggleSearchTermActiveAction(formData: FormData) {
  const gate = await requirePermission("settings_search", "update");
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await ensureSearchTermsTable().catch(() => undefined);
  const existing = await prisma.searchTerm.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!existing) return;

  await prisma.searchTerm.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  revalidatePath(SEARCH_SETTINGS_PATH);
}

export async function deleteSearchTermAction(formData: FormData) {
  const gate = await requirePermission("settings_search", "delete");
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await ensureSearchTermsTable().catch(() => undefined);
  await prisma.searchTerm.delete({ where: { id } }).catch(() => undefined);
  revalidatePath(SEARCH_SETTINGS_PATH);
}
