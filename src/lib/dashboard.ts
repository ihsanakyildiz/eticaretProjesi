import { prisma } from "@/lib/prisma";

export type DashboardStat = {
  title: string;
  value: number;
  active: number;
  href: string;
  linkLabel: string;
  tone: "teal" | "indigo" | "amber" | "sky" | "violet" | "rose";
  icon: "pages" | "works" | "projects" | "posts" | "heroes" | "menus";
};

export type DashboardCategoryBar = {
  name: string;
  count: number;
  percent: number;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  time: string;
  tone: "teal" | "indigo" | "amber" | "sky" | "violet";
};

export type DashboardModule = {
  label: string;
  description: string;
  href: string;
  count: number;
  tone: "teal" | "indigo" | "amber" | "sky" | "violet" | "rose";
};

function relativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tallyActive(
  rows: { isActive: boolean; _count: { _all: number } }[],
) {
  let total = 0;
  let active = 0;
  for (const row of rows) {
    total += row._count._all;
    if (row.isActive) active += row._count._all;
  }
  return { total, active };
}

export async function getDashboardData() {
  const now = new Date();

  const [
    pageCounts,
    workCounts,
    projectCounts,
    postCounts,
    heroCounts,
    cardTotal,
    faqGroupTotal,
    menuGroupTotal,
    workCategoryRows,
    projectCategoryRows,
    blogCategoryRows,
    recentPages,
    recentWorks,
    recentProjects,
    recentPosts,
  ] = await Promise.all([
    prisma.page.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.work.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.project.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.blogPost.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.hero.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.card.count(),
    prisma.faqGroup.count(),
    prisma.menuGroup.count(),
    prisma.workCategory.findMany({
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: {
        id: true,
        name: true,
        _count: { select: { works: true } },
      },
    }),
    prisma.projectCategory.findMany({
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: {
        id: true,
        name: true,
        _count: { select: { projects: true } },
      },
    }),
    prisma.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: {
        id: true,
        name: true,
        _count: { select: { posts: true } },
      },
    }),
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true, isActive: true },
    }),
    prisma.work.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true, isActive: true },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true, isActive: true },
    }),
    prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true, isActive: true },
    }),
  ]);

  const pages = tallyActive(pageCounts);
  const works = tallyActive(workCounts);
  const projects = tallyActive(projectCounts);
  const posts = tallyActive(postCounts);
  const heroes = tallyActive(heroCounts);
  const pageTotal = pages.total;
  const pageActive = pages.active;
  const workTotal = works.total;
  const workActive = works.active;
  const projectTotal = projects.total;
  const projectActive = projects.active;
  const postTotal = posts.total;
  const postActive = posts.active;
  const heroTotal = heroes.total;
  const heroActive = heroes.active;

  const stats: DashboardStat[] = [
    {
      title: "Sayfalar",
      value: pageTotal,
      active: pageActive,
      href: "/admin/pages",
      linkLabel: "Sayfaları gör",
      tone: "sky",
      icon: "pages",
    },
    {
      title: "Çalışmalar",
      value: workTotal,
      active: workActive,
      href: "/admin/works",
      linkLabel: "Çalışmaları gör",
      tone: "indigo",
      icon: "works",
    },
    {
      title: "Projeler",
      value: projectTotal,
      active: projectActive,
      href: "/admin/projects",
      linkLabel: "Projeleri gör",
      tone: "teal",
      icon: "projects",
    },
    {
      title: "Blog Yazıları",
      value: postTotal,
      active: postActive,
      href: "/admin/blog/posts",
      linkLabel: "Yazıları gör",
      tone: "amber",
      icon: "posts",
    },
    {
      title: "Hero Alanları",
      value: heroTotal,
      active: heroActive,
      href: "/admin/heroes",
      linkLabel: "Hero’ları gör",
      tone: "violet",
      icon: "heroes",
    },
    {
      title: "Menü Grupları",
      value: menuGroupTotal,
      active: menuGroupTotal,
      href: "/admin/menus",
      linkLabel: "Menüleri gör",
      tone: "rose",
      icon: "menus",
    },
  ];

  const distribution = [
    { label: "Sayfalar", value: pageTotal, tone: "sky" as const },
    { label: "Çalışmalar", value: workTotal, tone: "indigo" as const },
    { label: "Projeler", value: projectTotal, tone: "teal" as const },
    { label: "Blog", value: postTotal, tone: "amber" as const },
    { label: "Kartlar", value: cardTotal, tone: "violet" as const },
    { label: "SSS", value: faqGroupTotal, tone: "rose" as const },
  ];

  const categoryCandidates: DashboardCategoryBar[] = [
    ...workCategoryRows.map((row) => ({
      name: row.name,
      count: row._count.works,
      percent: 0,
      href: "/admin/works/categories",
    })),
    ...projectCategoryRows.map((row) => ({
      name: row.name,
      count: row._count.projects,
      percent: 0,
      href: "/admin/projects/categories",
    })),
    ...blogCategoryRows.map((row) => ({
      name: row.name,
      count: row._count.posts,
      percent: 0,
      href: "/admin/blog/categories",
    })),
  ]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maxCategory = Math.max(...categoryCandidates.map((row) => row.count), 1);
  const categories = categoryCandidates.map((row) => ({
    ...row,
    percent: Math.round((row.count / maxCategory) * 100),
  }));

  const activity: DashboardActivityItem[] = [
    ...recentPages.map((item) => ({
      id: `page-${item.id}`,
      title: item.title,
      description: item.isActive ? "Sayfa güncellendi" : "Pasif sayfa güncellendi",
      href: `/admin/pages/${item.id}/edit`,
      time: relativeTime(item.updatedAt, now),
      tone: "sky" as const,
      updatedAt: item.updatedAt,
    })),
    ...recentWorks.map((item) => ({
      id: `work-${item.id}`,
      title: item.title,
      description: item.isActive ? "Çalışma güncellendi" : "Pasif çalışma güncellendi",
      href: `/admin/works/${item.id}/edit`,
      time: relativeTime(item.updatedAt, now),
      tone: "indigo" as const,
      updatedAt: item.updatedAt,
    })),
    ...recentProjects.map((item) => ({
      id: `project-${item.id}`,
      title: item.title,
      description: item.isActive ? "Proje güncellendi" : "Pasif proje güncellendi",
      href: `/admin/projects/${item.id}/edit`,
      time: relativeTime(item.updatedAt, now),
      tone: "teal" as const,
      updatedAt: item.updatedAt,
    })),
    ...recentPosts.map((item) => ({
      id: `post-${item.id}`,
      title: item.title,
      description: item.isActive ? "Blog yazısı güncellendi" : "Pasif yazı güncellendi",
      href: `/admin/blog/posts/${item.id}/edit`,
      time: relativeTime(item.updatedAt, now),
      tone: "amber" as const,
      updatedAt: item.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8)
    .map(({ updatedAt, ...rest }) => {
      void updatedAt;
      return rest;
    });

  const modules: DashboardModule[] = [
    {
      label: "Sayfalar",
      description: "Klasik CMS sayfaları",
      href: "/admin/pages",
      count: pageTotal,
      tone: "sky",
    },
    {
      label: "Hero",
      description: "Slayt ve vitrin alanları",
      href: "/admin/heroes",
      count: heroTotal,
      tone: "violet",
    },
    {
      label: "Kartlar",
      description: "Özellik / hizmet kartları",
      href: "/admin/cards",
      count: cardTotal,
      tone: "indigo",
    },
    {
      label: "SSS",
      description: "Soru-cevap grupları",
      href: "/admin/faqs",
      count: faqGroupTotal,
      tone: "amber",
    },
    {
      label: "Menüler",
      description: "Header / footer / mega menü",
      href: "/admin/menus",
      count: menuGroupTotal,
      tone: "teal",
    },
    {
      label: "Ayarlar",
      description: "Genel, dil ve çeviriler",
      href: "/admin/settings",
      count: 0,
      tone: "rose",
    },
  ];

  const quickActions = [
    { label: "Yeni Sayfa", href: "/admin/pages/new" },
    { label: "Yeni Proje", href: "/admin/projects/new" },
    { label: "Yeni Çalışma", href: "/admin/works/new" },
    { label: "Yeni Blog Yazısı", href: "/admin/blog/posts/new" },
  ];

  return {
    stats,
    distribution,
    categories,
    activity,
    modules,
    quickActions,
    totals: {
      content:
        pageTotal + workTotal + projectTotal + postTotal + cardTotal + faqGroupTotal,
      active:
        pageActive + workActive + projectActive + postActive,
    },
  };
}
