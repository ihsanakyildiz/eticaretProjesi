import type { ReactNode } from "react";
import { CheckoutHeader } from "@/components/site/checkout/checkout-header";
import { getSettingsMap } from "@/lib/settings";

export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const siteName = settings.site_name || "İhsan Akyıldız";

  return (
    <div className="min-h-screen bg-site-bg">
      <CheckoutHeader siteName={siteName} />
      {children}
    </div>
  );
}
