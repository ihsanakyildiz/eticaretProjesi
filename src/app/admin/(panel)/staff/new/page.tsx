import type { Metadata } from "next";
import { StaffForm } from "../staff-form";

export const metadata: Metadata = {
  title: "Yeni personel",
};

export default function NewStaffPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Sistem</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni personel</h1>
        <p className="mt-2 text-sm text-slate-500">
          Hesabı oluşturup hangi sayfalarda ne yapabileceğini işaretleyin.
        </p>
      </div>
      <StaffForm mode="create" />
    </div>
  );
}
