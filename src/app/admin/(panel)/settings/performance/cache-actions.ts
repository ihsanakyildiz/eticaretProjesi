"use server";

import { auth } from "@/auth";
import { runCacheAction, type CacheActionMode, type CacheActionResult } from "@/lib/cache-manager";

export type CachePanelState = CacheActionResult & {
  error?: string;
};

export async function cacheAction(
  _prev: CachePanelState,
  formData: FormData,
): Promise<CachePanelState> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "", error: "Oturum bulunamadı." };
  }

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
