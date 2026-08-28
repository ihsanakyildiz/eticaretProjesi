import type { Metadata } from "next";
import { ProjectFeatureForm } from "../feature-form";

export const metadata: Metadata = {
  title: "Yeni Proje Özelliği",
};

export default function NewProjectFeaturePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Projeler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Özellik
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Projelerde seçilebilecek yeni bir teknoloji veya özellik ekleyin.
        </p>
      </div>

      <ProjectFeatureForm mode="create" />
    </div>
  );
}
