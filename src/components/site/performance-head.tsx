import { parseDomainList } from "@/lib/settings";
import { isWastedFirstPaintHint } from "@/lib/resource-hints";

type PerformanceHeadProps = {
  settings: Record<string, string>;
};

export function PerformanceHead({ settings }: PerformanceHeadProps) {
  const preconnect = parseDomainList(settings.perf_preconnect).filter(
    (origin) => !isWastedFirstPaintHint(origin),
  );
  const dnsPrefetch = parseDomainList(settings.perf_dns_prefetch).filter(
    (origin) => !isWastedFirstPaintHint(origin) && !preconnect.includes(origin),
  );

  return (
    <>
      {preconnect.map((origin) => (
        <link key={`preconnect-${origin}`} rel="preconnect" href={origin} crossOrigin="anonymous" />
      ))}
      {dnsPrefetch.map((origin) => (
        <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
      ))}
    </>
  );
}
