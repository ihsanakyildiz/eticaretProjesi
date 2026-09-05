import { SiteChrome } from "@/components/site/site-chrome";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteThemeProvider } from "@/components/site/site-theme-provider";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import { SiteWebChat } from "@/components/site/web-chat/site-web-chat";
import { auth } from "@/auth";
import { getWebChatKnownCustomer, isWebChatPublicEnabled } from "@/modules/support-chat/web-chat";
import {
  FALLBACK_FOOTER_BAR,
  FALLBACK_PAGE_NAV,
  getPublicHeaderNav,
  getPublicNavItems,
  getPublicNavItemsByPlacement,
} from "@/lib/menu-storefront";
import { getMembershipFlags } from "@/lib/membership";
import { getSettingsMap } from "@/lib/settings";
import { parseThemeMode } from "@/lib/site-theme";
import { CartProvider } from "@/components/site/cart/cart-provider";
import { SiteUrlProvider } from "@/components/site/site-url-provider";
import { parseUrlStructure } from "@/lib/url-structure";
import { Role } from "@prisma/client";

async function resolveFooterNav() {
  try {
    const items = await getPublicNavItems("footer-menu");
    if (!items?.length) {
      return [
        { label: "Ana Sayfa", href: "/" },
        { label: "Hizmetler", href: "/hizmetler" },
        { label: "Projeler", href: "/projeler" },
        { label: "Blog", href: "/blog" },
        { label: "İletişim", href: "/iletisim" },
      ];
    }
    return items.map((item) => ({
      label: item.label,
      href: item.href,
    }));
  } catch {
    return [{ label: "Ana Sayfa", href: "/" }];
  }
}

async function resolveFooterBarNav() {
  try {
    const items = await getPublicNavItemsByPlacement("FOOTER");
    if (!items?.length) return FALLBACK_FOOTER_BAR;
    return items.map((item) => ({
      label: item.label,
      href: item.href,
    }));
  } catch {
    return FALLBACK_FOOTER_BAR;
  }
}

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, headerNav, footerItems, footerBarItems, session, membership, webChatEnabled] =
    await Promise.all([
      getSettingsMap().catch(() => ({}) as Record<string, string>),
      getPublicHeaderNav().catch(() => ({
        pageItems: FALLBACK_PAGE_NAV,
        categoryItems: [],
      })),
      resolveFooterNav(),
      resolveFooterBarNav(),
      auth().catch(() => null),
      getMembershipFlags(),
      isWebChatPublicEnabled().catch(() => false),
    ]);

  const siteName = settings.site_name || "İhsan Akyıldız";
  const themeDefaultMode = parseThemeMode(settings.theme_default_mode);
  const urlStructure = parseUrlStructure(settings);
  const memberLoggedIn = Boolean(
    session?.user?.id &&
      (session.user.role === Role.MEMBER || session.user.role === Role.ADMIN),
  );
  const knownCustomer =
    webChatEnabled && session?.user?.id
      ? await getWebChatKnownCustomer(session.user.id).catch(() => null)
      : null;

  return (
    <SiteThemeProvider defaultMode={themeDefaultMode}>
      <SiteUrlProvider value={urlStructure}>
      <CartProvider>
      <div className="site-shell min-h-screen">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-site-primary focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          İçeriğe geç
        </a>
        <SiteChrome
          header={
            <SiteHeader
              siteName={siteName}
              phone={settings.contact_phone}
              email={settings.contact_email}
              address={settings.contact_address}
              hours={settings.contact_working_hours || "Pzt–Cum: 10:00 – 19:00"}
              ctaLabel="Teklif Alın"
              ctaHref="/iletisim"
              pageItems={headerNav.pageItems}
              categoryItems={headerNav.categoryItems}
              membershipEnabled={membership.enabled}
              memberLoggedIn={memberLoggedIn}
              memberName={session?.user?.name}
            />
          }
          footer={
            <>
              <SiteFooter
                siteName={siteName}
                description={
                  settings.site_description ||
                  "Web tasarım, yazılım ve dijital çözümlerle markanızı büyütüyoruz."
                }
                phone={settings.contact_phone}
                email={settings.contact_email}
                address={settings.contact_address}
                items={footerItems}
                barItems={footerBarItems}
              />
              <ScrollToTop />
            </>
          }
        >
          {children}
        </SiteChrome>
        {webChatEnabled ? (
          <SiteWebChat
            siteName={siteName}
            hours={settings.contact_working_hours || "Pzt–Cum: 10:00 – 19:00"}
            knownCustomer={knownCustomer}
          />
        ) : null}
      </div>
      </CartProvider>
      </SiteUrlProvider>
    </SiteThemeProvider>
  );
}
