import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ClassicPageForm } from "../../classic-page-form";

export const metadata: Metadata = {
  title: "Yeni Klasik Sayfa",
};

async function loadRelationOptions() {
  const [works, projects, posts] = await Promise.all([
    prisma.work.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        client: { select: { name: true } },
      },
    }),
    prisma.blogPost.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  return {
    workOptions: works.map((work) => ({
      id: work.id,
      label: work.title,
      isActive: work.isActive,
      meta: work.category?.name ?? null,
    })),
    projectOptions: projects.map((project) => ({
      id: project.id,
      label: project.title,
      isActive: project.isActive,
      meta: project.client?.name ?? null,
    })),
    postOptions: posts.map((post) => ({
      id: post.id,
      label: post.title,
      isActive: post.isActive,
      meta: post.category?.name ?? null,
    })),
  };
}

export default async function NewClassicPagePage() {
  const options = await loadRelationOptions();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tip seçimine dön
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
          Klasik Sayfa
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Sayfa
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          İçerik alanlarını doldurun ve isteğe bağlı olarak çalışmalar, projeler veya
          yazılar bağlayın.
        </p>
      </div>

      <ClassicPageForm mode="create" {...options} />
    </div>
  );
}
