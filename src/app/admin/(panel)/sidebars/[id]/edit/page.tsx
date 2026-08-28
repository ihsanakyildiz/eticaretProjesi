import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseSidebarWidgetSettings } from "@/config/site-sidebars";
import { prisma } from "@/lib/prisma";
import { SidebarForm } from "../../sidebar-form";
import { SidebarWidgetsPanel } from "../../sidebar-widgets-panel";

type EditSidebarPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditSidebarPageProps): Promise<Metadata> {
  const { id } = await params;
  const sidebar = await prisma.siteSidebar.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: sidebar ? `Düzenle: ${sidebar.name}` : "Sidebar Düzenle" };
}

export default async function EditSidebarPage({ params }: EditSidebarPageProps) {
  const { id } = await params;
  const sidebar = await prisma.siteSidebar.findUnique({
    where: { id },
    include: {
      widgets: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!sidebar) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Sidebar
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Sidebar Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {sidebar.name} · /{sidebar.slug}
        </p>
      </div>

      <SidebarWidgetsPanel
        sidebarId={sidebar.id}
        widgets={sidebar.widgets.map((widget) => ({
          id: widget.id,
          type: widget.type,
          title: widget.title,
          content: widget.content,
          imagePath: widget.imagePath,
          imageAlt: widget.imageAlt,
          isActive: widget.isActive,
          sortOrder: widget.sortOrder,
          settings: parseSidebarWidgetSettings(widget.settings),
        }))}
      />

      <SidebarForm
        mode="edit"
        initial={{
          id: sidebar.id,
          name: sidebar.name,
          slug: sidebar.slug,
          description: sidebar.description ?? "",
          location: sidebar.location,
          placement: sidebar.placement,
          sortOrder: sidebar.sortOrder,
          isActive: sidebar.isActive,
        }}
      />
    </div>
  );
}
