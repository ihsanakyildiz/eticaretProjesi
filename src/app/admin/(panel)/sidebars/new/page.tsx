import type { Metadata } from "next";
import { SidebarForm } from "../sidebar-form";

export const metadata: Metadata = {
  title: "Yeni Sidebar",
};

export default function NewSidebarPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Sidebar
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Sidebar
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Kenar çubuğunu oluşturduktan sonra içine widget ekleyebilirsiniz.
        </p>
      </div>
      <SidebarForm mode="create" />
    </div>
  );
}
