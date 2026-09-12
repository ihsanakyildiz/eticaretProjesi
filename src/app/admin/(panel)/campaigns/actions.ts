"use server";

import { revalidatePath } from "next/cache";
import {
  isCampaignKind,
  parseCampaignValue,
  parseCampaignWindow,
} from "@/lib/campaign-kinds";
import {
  createAndApplyCampaign,
  endCampaign,
  previewCampaignTargets,
  searchCampaignProducts,
  updateAndReapplyCampaign,
} from "@/lib/campaigns";
import { loadCampaignStatsDetail } from "@/lib/campaign-stats";
import { requirePermission } from "@/lib/staff-permissions";

function revalidateCampaigns(id?: string) {
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  revalidatePath("/katalog");
  if (id) revalidatePath(`/admin/campaigns/${id}`);
}

function readStringList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function parseTarget(formData: FormData) {
  return {
    categoryIds: readStringList(formData, "categoryIds"),
    brandIds: readStringList(formData, "brandIds"),
    productIds: readStringList(formData, "productIds"),
    inStockOnly: formData.get("inStockOnly") === "on" || formData.get("inStockOnly") === "true",
  };
}

export async function previewCampaignTargetsAction(formData: FormData) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error };
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  return previewCampaignTargets(parseTarget(formData), {
    ignoreCampaignId: campaignId || undefined,
  });
}

export async function searchCampaignProductsAction(query: string, campaignId?: string) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error, products: [] };
  const products = await searchCampaignProducts(query, {
    ignoreCampaignId: String(campaignId ?? "").trim() || undefined,
  });
  return { products };
}

function parseCampaignWrite(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "");
  if (!isCampaignKind(kindRaw)) {
    return { error: "Kampanya modelini seçin." };
  }

  const value = parseCampaignValue(kindRaw, String(formData.get("value") ?? ""));
  if (!value.ok) return { error: value.error };
  const window = parseCampaignWindow({
    countdown: formData.get("countdown") === "on" || formData.get("countdown") === "true",
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  });
  if (!window.ok) return { error: window.error };

  return {
    name: String(formData.get("name") ?? ""),
    kind: kindRaw,
    valueInt: value.valueInt,
    countdown: window.endsAt != null,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    ...parseTarget(formData),
  };
}

export async function createCampaignAction(formData: FormData) {
  const gate = await requirePermission("campaigns", "create");
  if (!gate.ok) return { error: gate.error };

  const parsed = parseCampaignWrite(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = await createAndApplyCampaign(parsed);
  if ("error" in result) return { error: result.error };
  revalidateCampaigns(result.id);
  return {
    id: result.id,
    applied: result.applied,
    skipped: result.skipped,
  };
}

export async function updateCampaignAction(formData: FormData) {
  const gate = await requirePermission("campaigns", "update");
  if (!gate.ok) return { error: gate.error };

  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { error: "Kampanya bulunamadı." };

  const parsed = parseCampaignWrite(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = await updateAndReapplyCampaign(campaignId, parsed);
  if ("error" in result) return { error: result.error };
  revalidateCampaigns(result.id);
  return {
    id: result.id,
    applied: result.applied,
    skipped: result.skipped,
    removed: result.removed,
    added: result.added,
  };
}

export async function loadCampaignStatsAction(campaignId: string) {
  const gate = await requirePermission("campaigns", "view");
  if (!gate.ok) return { error: gate.error };
  const id = String(campaignId ?? "").trim();
  if (!id) return { error: "Kampanya bulunamadı." };
  const stats = await loadCampaignStatsDetail(id);
  if (!stats) return { error: "Kampanya bulunamadı." };
  return { stats };
}

export async function endCampaignAction(campaignId: string) {
  const gate = await requirePermission("campaigns", "update");
  if (!gate.ok) return { error: gate.error };
  const id = String(campaignId ?? "").trim();
  if (!id) return { error: "Kampanya bulunamadı." };
  const result = await endCampaign(id, true);
  if ("error" in result) return { error: result.error };
  revalidateCampaigns(id);
  return { restored: result.restored };
}
