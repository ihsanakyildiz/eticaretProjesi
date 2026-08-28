import type { NextConfig } from "next";
import path from "path";

const emptyPolyfill = path.join(process.cwd(), "src/lib/empty-polyfill.js");

const htmlCacheSeconds = Number(process.env.PERF_HTML_CACHE_SECONDS || "0");
const assetCacheDays = Number(process.env.PERF_ASSET_CACHE_DAYS || "365");
const staleWhileRevalidate =
  process.env.PERF_STALE_WHILE_REVALIDATE !== "false";
const assetMaxAge = Math.max(1, assetCacheDays) * 86_400;
const assetCacheControl = `public, max-age=${assetMaxAge}, immutable${
  staleWhileRevalidate ? `, stale-while-revalidate=${assetMaxAge}` : ""
}`;

const nextConfig: NextConfig = {
  serverExternalPackages: ["imapflow", "mailparser"],
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": emptyPolyfill,
      "next/dist/build/polyfills/polyfill-module": emptyPolyfill,
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "next/dist/build/polyfills/polyfill-module": emptyPolyfill,
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "16mb",
      allowedOrigins: [
        "www.ihsanakyildiz.com.tr",
        "ihsanakyildiz.com.tr",
        "localhost:3000",
        "localhost:3001",
        "127.0.0.1:3000",
        "127.0.0.1:3001",
      ],
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    const htmlHeaders =
      htmlCacheSeconds > 0
        ? [
            {
              source: "/",
              headers: [
                {
                  key: "Cache-Control",
                  value: `public, s-maxage=${htmlCacheSeconds}${
                    staleWhileRevalidate
                      ? `, stale-while-revalidate=${Math.max(htmlCacheSeconds, 60)}`
                      : ""
                  }`,
                },
              ],
            },
          ]
        : [];

    return [
      ...htmlHeaders,
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: assetCacheControl,
          },
        ],
      },
      {
        source: "/:file(favicon-16x16|favicon-32x32|apple-touch-icon).:ext(png|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/site.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
