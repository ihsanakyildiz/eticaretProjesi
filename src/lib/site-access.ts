import { Role } from "@prisma/client";
import { isSettingEnabled } from "@/lib/settings";

export type DemoNotice = {
  title: string;
  message: string;
};

export function isMaintenanceMode(settings: Record<string, string>) {
  return isSettingEnabled(settings, "maintenance_mode");
}

export function canBypassMaintenance(role?: string | null) {
  return role === Role.ADMIN || role === Role.STAFF;
}

export function getDemoNotice(settings: Record<string, string>): DemoNotice | null {
  if (!isSettingEnabled(settings, "demo_mode")) return null;
  const title = settings.demo_mode_title?.trim() || "Bu mağaza demo amaçlıdır";
  const message =
    settings.demo_mode_message?.trim() ||
    "Gördüğünüz ürünler ve fiyatlar inceleme / test içindir. Lütfen gerçek sipariş vermeyin.";
  return { title, message };
}
