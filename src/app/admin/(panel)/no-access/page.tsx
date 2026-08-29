import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Yetki yok",
};

export default function AdminNoAccessPage() {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-800">Bu sayfa için yetkiniz yok</h1>
        <p className="mt-2 text-sm text-slate-500">
          Açmaya çalıştığınız bölüme erişim tanınmamış. Soldaki menüden yetkili olduğunuz bir
          sayfayı seçin veya yöneticinizden yetki isteyin.
        </p>
      </div>
    </div>
  );
}
