import type { Metadata } from "next";
import { HeroForm } from "../hero-form";

export const metadata: Metadata = {
  title: "Yeni Hero Alanı",
};

export default function NewHeroPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Hero</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Hero Alanı
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Önce alanı oluşturun, ardından slaytları ekleyin.
        </p>
      </div>
      <HeroForm mode="create" />
    </div>
  );
}
