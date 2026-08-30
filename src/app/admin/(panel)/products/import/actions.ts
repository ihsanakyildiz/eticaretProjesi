"use server";

import { after } from "next/server";
import {
  createImportJobFromWorkbook,
  getImportJobSummary,
  getLatestImportJob,
  listImportJobRows,
  queueImportJob,
  type ProductImportFilter,
  type ProductImportJobSummary,
  type ProductImportRowPage,
} from "@/lib/product-import-job";
import { kickImportWorker } from "@/lib/product-import-worker";
import { requirePermission } from "@/lib/staff-permissions";

export type ProductImportPreviewState = {
  error?: string;
  job?: ProductImportJobSummary;
};

export async function previewProductImportAction(
  _prev: ProductImportPreviewState,
  formData: FormData,
): Promise<ProductImportPreviewState> {
  const gate = await requirePermission("products", "create");
  if (!gate.ok) return { error: gate.error };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Excel dosyası seçin." };

  try {
    const created = await createImportJobFromWorkbook(file);
    if ("error" in created && created.error) return { error: created.error };
    if (!("job" in created) || !created.job) return { error: "Dosya okunamadı." };
    return { job: created.job };
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error ? error.message : "Excel dosyası okunamadı." };
  }
}

export async function startProductImportAction(
  jobId: string,
): Promise<{ error?: string; job?: ProductImportJobSummary }> {
  const gate = await requirePermission("products", "create");
  if (!gate.ok) return { error: gate.error };

  const queued = await queueImportJob(jobId);
  if ("error" in queued && queued.error) return { error: queued.error };

  after(() => {
    kickImportWorker();
  });

  const job = await getImportJobSummary(jobId);
  return job ? { job } : { error: "Yükleme işi bulunamadı." };
}

export async function getProductImportJobAction(jobId?: string) {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const job = jobId ? await getImportJobSummary(jobId) : await getLatestImportJob();
  if (job && (job.status === "QUEUED" || job.status === "RUNNING")) {
    kickImportWorker();
  }
  return { job };
}

export async function listProductImportRowsAction(
  jobId: string,
  filter: ProductImportFilter,
  page: number,
): Promise<{ error?: string; page?: ProductImportRowPage }> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  return { page: await listImportJobRows(jobId, filter, page) };
}

export async function resumeProductImportJobsAction() {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  kickImportWorker();
  return { ok: true as const };
}
