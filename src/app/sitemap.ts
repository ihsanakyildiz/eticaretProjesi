import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicPageHref } from "@/lib/public-urls";
import { getSettingsMap } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-origin";

function entry(
  origin: string,
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const origin = getSiteOrigin(settings);
  const now = new Date();

  const items: MetadataRoute.Sitemap = [
    entry(origin, "/", now, "weekly", 1),
    entry(origin, "/projeler", now, "weekly", 0.8),
    entry(origin, "/projeler/kategori", now, "weekly", 0.7),
    entry(origin, "/projeler/etiket", now, "weekly", 0.65),
    entry(origin, "/yapilan-isler", now, "weekly", 0.8),
    entry(origin, "/yapilan-isler/kategori", now, "weekly", 0.7),
    entry(origin, "/blog", now, "weekly", 0.8),
    entry(origin, "/blog/kategori", now, "weekly", 0.7),
    entry(origin, "/iletisim", now, "monthly", 0.6),
  ];

  try {
    const [pages, projects, works, posts, projectCats, workCats, blogCats, projectTags] =
      await Promise.all([
        prisma.page.findMany({
          where: { isActive: true, slug: { not: "anasayfa" } },
          select: { slug: true, updatedAt: true },
        }),
        prisma.project.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.work.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.blogPost.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.projectCategory.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.workCategory.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.blogCategory.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
        prisma.projectFeature.findMany({
          where: { isActive: true, projects: { some: { isActive: true } } },
          select: { slug: true, updatedAt: true },
        }),
      ]);

    for (const page of pages) {
      items.push(entry(origin, publicPageHref(page.slug), page.updatedAt, "monthly", 0.7));
    }
    for (const row of projectCats) {
      items.push(
        entry(origin, `/projeler/kategori/${row.slug}`, row.updatedAt, "weekly", 0.65),
      );
    }
    for (const row of projectTags) {
      items.push(entry(origin, `/projeler/etiket/${row.slug}`, row.updatedAt, "weekly", 0.6));
    }
    for (const row of projects) {
      items.push(entry(origin, `/projeler/${row.slug}`, row.updatedAt, "monthly", 0.7));
    }
    for (const row of workCats) {
      items.push(
        entry(origin, `/yapilan-isler/kategori/${row.slug}`, row.updatedAt, "weekly", 0.65),
      );
    }
    for (const row of works) {
      items.push(
        entry(origin, `/yapilan-isler/${row.slug}`, row.updatedAt, "monthly", 0.7),
      );
    }
    for (const row of blogCats) {
      items.push(entry(origin, `/blog/kategori/${row.slug}`, row.updatedAt, "weekly", 0.6));
    }
    for (const row of posts) {
      items.push(entry(origin, `/blog/${row.slug}`, row.updatedAt, "weekly", 0.75));
    }
  } catch {
    // Sitemap hub URL'leri yine de yayınlanır
  }

  return items;
}
