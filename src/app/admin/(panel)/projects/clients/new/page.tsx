import type { Metadata } from "next";
import { ProjectClientForm } from "../client-form";

export const metadata: Metadata = {
  title: "Yeni Müşteri",
};

export default function NewProjectClientPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Projeler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Müşteri
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Projelerde seçilebilecek yeni bir müşteri kaydı oluşturun.
        </p>
      </div>

      <ProjectClientForm mode="create" />
    </div>
  );
}
