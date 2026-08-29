import { Lock } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";

export function CheckoutHeader({ siteName }: { siteName: string }) {
  return (
    <header className="border-b border-site-border bg-site-bg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <SiteLink href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-site-primary text-sm font-bold text-white">
            {siteName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-base font-bold tracking-tight text-site-fg">
            {siteName}
          </span>
        </SiteLink>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden items-center gap-1.5 text-xs font-medium text-site-muted sm:inline-flex">
            <Lock className="h-3.5 w-3.5" />
            Güvenli ödeme
          </span>
          <SiteLink
            href="/sepet"
            className="text-sm font-semibold text-site-primary hover:underline"
          >
            Sepete dön
          </SiteLink>
        </div>
      </div>
    </header>
  );
}
