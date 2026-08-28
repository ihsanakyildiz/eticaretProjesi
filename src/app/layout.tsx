import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { DeferredAnalytics } from "@/components/site/deferred-analytics";
import { PerformanceHead } from "@/components/site/performance-head";
import { PerformanceProvider } from "@/components/site/performance-provider";
import { SiteCustomCode } from "@/components/site/site-custom-code";
import { SiteCustomHeadTags } from "@/components/site/site-custom-head-tags";
import { SiteThemeStyles } from "@/components/site/site-theme-styles";
import { RouteLoadingIndicator } from "@/components/route-loading-indicator";
import { isAdminRequest } from "@/lib/admin-request";
import { parsePerformance } from "@/lib/performance";
import { getSettingsMap, isSettingEnabled } from "@/lib/settings";
import { getThemeDefaultModeScript, parseThemeMode } from "@/lib/site-theme";
import { getSiteOrigin } from "@/lib/site-origin";
import { getWebpCompanion } from "@/lib/uploads";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: true,
});

function iconEntries(pngPath: string, sizes: string) {
  const webp = getWebpCompanion(pngPath);
  if (webp) {
    return [
      { url: webp, sizes, type: "image/webp" as const },
      { url: pngPath, sizes, type: "image/png" as const },
    ];
  }
  return [{ url: pngPath, sizes, type: "image/png" as const }];
}

export async function generateMetadata(): Promise<Metadata> {
  if (await isAdminRequest()) {
    return {
      title: {
        default: "Yönetim Paneli",
        template: "%s | Admin",
      },
      robots: "noindex, nofollow",
    };
  }

  try {
    const settings = await getSettingsMap();
    const siteName = settings.site_name || "İhsan Akyıldız";
    const fav16 = settings.favicon_16 || "/favicon-16x16.png";
    const fav32 = settings.favicon_32 || "/favicon-32x32.png";
    const apple = settings.favicon_apple_touch || "/apple-touch-icon.png";
    const cdn = settings.perf_cdn_url?.replace(/\/$/, "");

    return {
        metadataBase: new URL(getSiteOrigin(settings)),
      title: {
        default: settings.seo_title || siteName,
        template: `%s | ${siteName}`,
      },
      description:
        settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
      keywords: settings.seo_keywords
        ? settings.seo_keywords.split(",").map((item) => item.trim()).filter(Boolean)
        : undefined,
      icons: {
        icon: [...iconEntries(fav16, "16x16"), ...iconEntries(fav32, "32x32")],
        apple: [{ url: apple, sizes: "180x180", type: "image/png" }],
      },
      manifest: settings.site_webmanifest || "/site.webmanifest",
      openGraph: {
        type: "website",
        locale: "tr_TR",
        siteName,
        title: settings.seo_title || siteName,
        description:
          settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
        images: settings.seo_og_image
          ? [
              {
                url: cdn ? `${cdn}${settings.seo_og_image}` : settings.seo_og_image,
                width: 1200,
                height: 630,
                type: settings.seo_og_image.endsWith(".webp") ? "image/webp" : undefined,
                alt: siteName,
              },
            ]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: settings.seo_title || siteName,
        description:
          settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
        images: settings.seo_og_image
          ? [cdn ? `${cdn}${settings.seo_og_image}` : settings.seo_og_image]
          : undefined,
      },
      robots: settings.seo_robots || "index, follow",
      verification: settings.google_site_verification
        ? { google: settings.google_site_verification }
        : undefined,
      other: {
        "format-detection": "telephone=no",
      },
    };
  } catch {
    return {
      title: {
        default: "İhsan Akyıldız",
        template: "%s | İhsan Akyıldız",
      },
      description: "Web tasarım ve yazılım stüdyosu",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await isAdminRequest();
  let settings: Record<string, string> = {};
  if (!isAdmin) {
    try {
      settings = await getSettingsMap();
    } catch {
      settings = {};
    }
  }

  const perf = parsePerformance(settings);
  const smoothScroll = isAdmin
    ? false
    : isSettingEnabled(settings, "perf_instant_scroll", false);
  const reduceMotion = isAdmin
    ? false
    : isSettingEnabled(settings, "perf_reduce_motion", true);
  const thirdPartyDisabled = isAdmin
    ? true
    : isSettingEnabled(settings, "perf_disable_third_party", false);
  const deferAnalytics = isSettingEnabled(settings, "perf_defer_analytics", true);
  const delayMs = Number.parseInt(settings.perf_analytics_delay_ms || "3000", 10);
  const themeDefaultMode = parseThemeMode(settings.theme_default_mode);

  const htmlClass = [
    smoothScroll ? "perf-smooth-scroll" : "",
    reduceMotion ? "perf-respect-reduced-motion" : "",
    perf.fontDisplaySwap ? "perf-font-swap" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang="tr"
      className={htmlClass || undefined}
      data-lazy-images={perf.lazyImages ? "true" : "false"}
      data-lazy-iframes={perf.lazyIframes ? "true" : "false"}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeDefaultModeScript(themeDefaultMode),
          }}
        />
        {isAdmin ? null : <SiteThemeStyles settings={settings} />}
        {isAdmin ? null : <PerformanceHead settings={settings} />}
        {isAdmin ? null : <SiteCustomHeadTags code={settings.custom_code_head} />}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} antialiased`}
      >
        <PerformanceProvider value={perf}>
          <RouteLoadingIndicator enabled={isAdmin || perf.showLoadingIndicator} />
          {children}
        </PerformanceProvider>
        {isAdmin ? null : (
          <DeferredAnalytics
            enabled={!thirdPartyDisabled}
            defer={deferAnalytics}
            delayMs={Number.isFinite(delayMs) ? delayMs : 3000}
            googleAnalyticsId={settings.google_analytics_id || undefined}
            googleTagManagerId={settings.google_tag_manager_id || undefined}
          />
        )}
        {isAdmin ? null : (
          <SiteCustomCode
            headCode={settings.custom_code_head}
            bodyCode={settings.custom_code_body}
          />
        )}
      </body>
    </html>
  );
}
