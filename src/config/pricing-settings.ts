import type { SettingGroupDef } from "@/config/settings";

export const pricingSettingGroups: SettingGroupDef[] = [
  {
    id: "pricing_billing",
    title: "Fiyatlandırma modeli",
    description:
      "Varsayılan: tek seferlik proje bedeli. Aylık veya yıllık açarsanız abonelik moduna geçilir.",
    fields: [
      {
        key: "pricing_billing_monthly_enabled",
        label: "Aylık fiyatlandırma (abonelik)",
        type: "boolean",
        hint: "Kapalı tutulması önerilir — web/yazılım paketleri tek seferlik fiyatlandırılır.",
        defaultValue: "false",
      },
      {
        key: "pricing_billing_yearly_enabled",
        label: "Yıllık fiyatlandırma (abonelik)",
        type: "boolean",
        hint: "Kapalı tutulması önerilir. İkisi de kapalıysa sitede tek seferlik proje fiyatı gösterilir.",
        defaultValue: "false",
      },
    ],
  },
];
