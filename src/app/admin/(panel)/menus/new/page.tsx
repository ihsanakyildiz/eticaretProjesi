import type { Metadata } from "next";
import { MenuGroupForm } from "../menu-group-form";

export const metadata: Metadata = {
  title: "Yeni Menü",
  description: "Yeni menü grubu oluşturun",
};

export default function NewMenuGroupPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Menüler</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Menü Grubu
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Örn. Header Menü, Footer Menü — ardından öğeleri ekleyebilirsiniz.
        </p>
      </div>
      <MenuGroupForm mode="create" />
    </div>
  );
}
