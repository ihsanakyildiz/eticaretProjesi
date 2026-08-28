import type { Metadata } from "next";
import { FaqGroupForm } from "../faq-group-form";

export const metadata: Metadata = {
  title: "Yeni SSS Grubu",
};

export default function NewFaqGroupPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">SSS</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni SSS Grubu
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Önce grubu oluşturun, ardından içine sorular ekleyin.
        </p>
      </div>
      <FaqGroupForm mode="create" />
    </div>
  );
}
