"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { usePerformance } from "@/components/site/performance-provider";

const OPTIMIZED_REMOTE_HOSTS = new Set(["images.unsplash.com"]);

export function SiteImageFallback({
  fill,
  className,
}: {
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label="Görsel yok"
      className={`${
        fill ? "absolute inset-0" : ""
      } flex items-center justify-center bg-site-surface px-2 text-center text-xs font-medium text-site-muted ${className ?? ""}`}
    >
      Görsel yok
    </div>
  );
}

function srcKind(src: ImageProps["src"]): "static" | "local" | "optimized-remote" | "remote" | "invalid" {
  if (typeof src !== "string") return "static";
  const value = src.trim();
  if (!value) return "invalid";
  if (value.startsWith("/") && !value.startsWith("//")) return "local";

  try {
    const url = value.startsWith("//") ? new URL(`https:${value}`) : new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid";
    if (OPTIMIZED_REMOTE_HOSTS.has(url.hostname)) return "optimized-remote";
    return "remote";
  } catch {
    return "invalid";
  }
}

export function SiteImage({
  alt = "",
  priority,
  quality,
  sizes,
  loading,
  src,
  fill,
  width,
  height,
  className,
  style,
  onError,
  ...rest
}: ImageProps) {
  const perf = usePerformance();
  const [failed, setFailed] = useState(false);
  const kind = srcKind(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolvedLoading = priority
    ? undefined
    : (loading ?? (perf.lazyImages ? "lazy" : "eager"));

  if (failed || kind === "invalid") {
    return <SiteImageFallback fill={fill} className={className} />;
  }

  const markFailed = () => setFailed(true);

  if (kind === "remote") {
    const remoteSrc = typeof src === "string" ? src.trim() : "";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={remoteSrc}
        alt={alt}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        loading={resolvedLoading}
        fetchPriority={priority ? "high" : rest.fetchPriority}
        className={`${fill ? "absolute inset-0 h-full w-full" : ""} ${className ?? ""}`}
        style={style}
        onError={(event) => {
          markFailed();
          onError?.(event);
        }}
      />
    );
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
      fetchPriority={priority ? "high" : rest.fetchPriority}
      loading={resolvedLoading}
      quality={quality ?? perf.imageQuality}
      sizes={perf.responsiveImages ? sizes : (sizes ?? "100vw")}
      onError={(event) => {
        markFailed();
        onError?.(event);
      }}
    />
  );
}
