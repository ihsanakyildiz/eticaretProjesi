import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import { prisma } from "@/lib/prisma";
import { resolvePageSeo } from "@/lib/seo";
import type { PageSectionTypeValue } from "@/lib/page-sections";
import { publicPageHref } from "@/lib/public-urls";
import { AdvancedPageMetaForm } from "../../advanced-page-meta-form";
import { ClassicPageForm } from "../../classic-page-form";
import {
  PageBuilder,
  type BuilderSection,
} from "../../page-builder";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: page ? `Düzenle: ${page.title}` : "Sayfa Düzenle" };
}

async function loadRelationOptions(selected: {
  workIds: Set<string>;
  projectIds: Set<string>;
  postIds: Set<string>;
}) {
  const [works, projects, posts] = await Promise.all([
    prisma.work.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        client: { select: { name: true } },
      },
    }),
    prisma.blogPost.findMany({
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
    workOptions: works
      .filter((work) => work.isActive || selected.workIds.has(work.id))
      .map((work) => ({
        id: work.id,
        label: work.title,
        isActive: work.isActive,
        meta: work.category?.name ?? null,
      })),
    projectOptions: projects
      .filter((project) => project.isActive || selected.projectIds.has(project.id))
      .map((project) => ({
        id: project.id,
        label: project.title,
        isActive: project.isActive,
        meta: project.client?.name ?? null,
      })),
    postOptions: posts
      .filter((post) => post.isActive || selected.postIds.has(post.id))
      .map((post) => ({
        id: post.id,
        label: post.title,
        isActive: post.isActive,
        meta: post.category?.name ?? null,
      })),
  };
}

async function loadBuilderOptions() {
  const [
    classicCards,
    advancedCards,
    projects,
    posts,
    works,
    heroes,
    faqs,
    projectCategories,
    workCategories,
    blogCategories,
  ] = await Promise.all([
    prisma.card.findMany({
      where: { type: "CLASSIC" },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, isActive: true },
    }),
    prisma.card.findMany({
      where: { type: "ADVANCED" },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, isActive: true },
    }),
    prisma.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        client: { select: { name: true } },
      },
    }),
    prisma.blogPost.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.work.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.hero.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    prisma.faqGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    prisma.projectCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.workCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.blogCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  return {
    cardOptions: classicCards.map((card) => ({
      id: card.id,
      label: card.title,
      isActive: card.isActive,
    })),
    advancedCardOptions: advancedCards.map((card) => ({
      id: card.id,
      label: card.title,
      isActive: card.isActive,
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
    workOptions: works.map((work) => ({
      id: work.id,
      label: work.title,
      isActive: work.isActive,
      meta: work.category?.name ?? null,
    })),
    heroOptions: heroes
      .filter((hero) => hero.isActive)
      .map((hero) => ({
        id: hero.id,
        label: `${hero.name} (${hero.slug})`,
      })),
    faqOptions: faqs
      .filter((faq) => faq.isActive)
      .map((faq) => ({
        id: faq.id,
        label: `${faq.name} (${faq.slug})`,
      })),
    projectCategoryOptions: projectCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, label: category.name })),
    workCategoryOptions: workCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, label: category.name })),
    blogCategoryOptions: blogCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, label: category.name })),
  };
}

export default async function EditPagePage({ params }: EditPageProps) {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      works: { select: { id: true } },
      projects: { select: { id: true } },
      posts: { select: { id: true } },
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          cards: { orderBy: { sortOrder: "asc" }, select: { cardId: true } },
          projects: {
            orderBy: { sortOrder: "asc" },
            select: { projectId: true },
          },
          posts: { orderBy: { sortOrder: "asc" }, select: { postId: true } },
          works: { orderBy: { sortOrder: "asc" }, select: { workId: true } },
        },
      },
    },
  });
  if (!page) notFound();

  if (page.type === "ADVANCED") {
    const options = await loadBuilderOptions();
    const builderSections: BuilderSection[] = page.sections.map((section) => ({
      id: section.id,
      type: section.type as PageSectionTypeValue,
      parentId: section.parentId ?? null,
      label: section.label,
      title: section.title,
      subtitle: section.subtitle,
      content: section.content,
      settings: section.settings,
      sortOrder: section.sortOrder,
      isActive: section.isActive,
      heroId: section.heroId,
      faqGroupId: section.faqGroupId,
      projectCategoryId: section.projectCategoryId,
      workCategoryId: section.workCategoryId,
      blogCategoryId: section.blogCategoryId,
      cardIds: section.cards.map((row) => row.cardId),
      projectIds: section.projects.map((row) => row.projectId),
      postIds: section.posts.map((row) => row.postId),
      workIds: section.works.map((row) => row.workId),
    }));

    const publicHref = publicPageHref(page.slug);

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Sayfalara dön
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#405189] uppercase">
                Gelişmiş Sayfa
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
                {page.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">/{page.slug}</p>
            </div>
            <AdminPublicLink href={publicHref} variant="button" />
          </div>
        </div>

        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            Sayfa bilgileri
          </h2>
          <AdvancedPageMetaForm
            mode="edit"
            initial={{
              id: page.id,
              title: page.title,
              slug: page.slug,
              sortOrder: page.sortOrder,
              isActive: page.isActive,
              sidebarEnabled: page.sidebarEnabled,
              seoTitle: page.seoTitle ?? "",
              seoDescription: page.seoDescription ?? "",
            }}
          />
        </div>

        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <PageBuilder
            pageId={page.id}
            sections={builderSections}
            {...options}
          />
        </div>
      </div>
    );
  }

  const options = await loadRelationOptions({
    workIds: new Set(page.works.map((item) => item.id)),
    projectIds: new Set(page.projects.map((item) => item.id)),
    postIds: new Set(page.posts.map((item) => item.id)),
  });

  const autoSeo = resolvePageSeo({
    title: page.title,
    summary: page.summary,
    content: page.content,
  });

  const seoTitle =
    page.seoTitle && page.seoTitle !== autoSeo.seoTitle ? page.seoTitle : "";
  const seoDescription =
    page.seoDescription && page.seoDescription !== autoSeo.seoDescription
      ? page.seoDescription
      : "";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Klasik Sayfa
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              Sayfayı Düzenle
            </h1>
            <p className="mt-2 text-sm text-slate-500">{page.title}</p>
          </div>
          <AdminPublicLink href={publicPageHref(page.slug)} variant="button" />
        </div>
      </div>

      <ClassicPageForm
        mode="edit"
        workOptions={options.workOptions}
        projectOptions={options.projectOptions}
        postOptions={options.postOptions}
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          summary: page.summary ?? "",
          content: page.content ?? "",
          image: page.image ?? "",
          sortOrder: page.sortOrder,
          isActive: page.isActive,
          sidebarEnabled: page.sidebarEnabled,
          seoTitle,
          seoDescription,
          workIds: page.works.map((item) => item.id),
          projectIds: page.projects.map((item) => item.id),
          postIds: page.posts.map((item) => item.id),
        }}
      />
    </div>
  );
}
