"use server";

import { runCacheAction, type CacheActionMode, type CacheActionResult } from "@/lib/cache-manager";
import { requirePermission } from "@/lib/staff-permissions";

export type CachePanelState = CacheActionResult & {
  error?: string;
};

export async function cacheAction(
  _prev: CachePanelState,
  formData: FormData,
): Promise<CachePanelState> {
  const gate = await requirePermission("settings_performance", "update");
  if (!gate.ok) return { success: false, message: "", error: gate.error };

  const mode = String(formData.get("mode") ?? "refresh") as CacheActionMode;
  if (mode !== "refresh" && mode !== "purge") {
    return { success: false, message: "", error: "Geçersiz önbellek işlemi." };
  }

  try {
    return await runCacheAction(mode);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Önbellek işlemi başarısız.";
    return { success: false, message: "", error: message };
  }
}
