import type { MetadataRoute } from "next";
import { getSettingsMap } from "@/lib/settings";
import { isMaintenanceMode } from "@/lib/site-access";
import { getSiteOrigin } from "@/lib/site-origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const origin = getSiteOrigin(settings);

  if (isMaintenanceMode(settings)) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: origin,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/login"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
