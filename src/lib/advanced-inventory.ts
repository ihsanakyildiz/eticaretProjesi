import { getSettingsMap, isSettingEnabled } from "@/lib/settings";

export const ADVANCED_INVENTORY_SETTING_KEY = "advanced_inventory";

export function isAdvancedInventoryEnabledInMap(map: Record<string, string>) {
  return isSettingEnabled(map, ADVANCED_INVENTORY_SETTING_KEY, false);
}

export async function isAdvancedInventoryEnabled() {
  const map = await getSettingsMap();
  return isAdvancedInventoryEnabledInMap(map);
}
