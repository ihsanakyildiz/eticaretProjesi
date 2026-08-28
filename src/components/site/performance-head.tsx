import { isSettingEnabled, parseDomainList } from "@/lib/settings";

type PerformanceHeadProps = {
  settings: Record<string, string>;
};

export function PerformanceHead({ settings }: PerformanceHeadProps) {
  const preconnect = parseDomainList(settings.perf_preconnect);
  const dnsPrefetch = parseDomainList(settings.perf_dns_prefetch);
  const preloadLogo = isSettingEnabled(settings, "perf_preload_logo", true);
  const logo = settings.site_logo;

  return (
    <>
      {preconnect.map((origin) => (
        <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="anonymous" />
      ))}
      {dnsPrefetch
        .filter((origin) => !preconnect.includes(origin))
        .map((origin) => (
          <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
      {preloadLogo && logo ? (
        <link
          rel="preload"
          as="image"
          href={logo}
          type={logo.endsWith(".svg") ? "image/svg+xml" : logo.endsWith(".webp") ? "image/webp" : undefined}
        />
      ) : null}
      <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />
    </>
  );
}
