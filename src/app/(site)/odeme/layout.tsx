import type { ReactNode } from "react";
import { CheckoutHeader } from "@/components/site/checkout/checkout-header";
import { parsePerformance } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";

export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const perf = parsePerformance(settings);
  const siteName = settings.site_name || "İhsan Akyıldız";

  return (
    <div className="min-h-screen bg-site-bg">
      <CheckoutHeader siteName={siteName} prefetchLinks={perf.checkoutPrefetch} />
      {children}
    </div>
  );
}
