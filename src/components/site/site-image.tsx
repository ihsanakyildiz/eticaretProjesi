"use client";

import Image, { type ImageProps } from "next/image";
import { usePerformance } from "@/components/site/performance-provider";

export function SiteImage({
  alt = "",
  priority,
  quality,
  sizes,
  loading,
  ...rest
}: ImageProps) {
  const perf = usePerformance();
  const resolvedLoading = priority
    ? undefined
    : (loading ?? (perf.lazyImages ? "lazy" : "eager"));

  return (
    <Image
      {...rest}
      alt={alt}
      priority={priority}
      fetchPriority={priority ? "high" : rest.fetchPriority}
      loading={resolvedLoading}
      quality={quality ?? perf.imageQuality}
      sizes={perf.responsiveImages ? sizes : (sizes ?? "100vw")}
    />
  );
}
