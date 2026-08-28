import type { Metadata } from "next";
import { Check, Globe, X } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Diller",
  description: "Site dillerini yönetin",
};

export default async function LanguagesPage() {
  const languages = await prisma.language.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Diller</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Sitede kullanılacak dilleri görüntüleyin. Varsayılan dil ve aktiflik durumu burada
          listelenir. Gelişmiş düzenleme bir sonraki adımda eklenecek.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e9ebec] bg-[#f3f6f9] text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-semibold">Dil</th>
                <th className="px-5 py-3 font-semibold">Kod</th>
                <th className="px-5 py-3 font-semibold">Varsayılan</th>
                <th className="px-5 py-3 font-semibold">Durum</th>
                <th className="px-5 py-3 font-semibold">Sıra</th>
              </tr>
            </thead>
            <tbody>
              {languages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Henüz dil kaydı yok. Seed çalıştırdıktan sonra Türkçe ve İngilizce görünür.
                  </td>
                </tr>
              ) : (
                languages.map((language) => (
                  <tr key={language.id} className="border-b border-[#e9ebec] last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#405189]/10 text-[#405189]">
                          <Globe className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-slate-800">{language.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {language.code}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      {language.isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#0ab39c]/10 px-2.5 py-1 text-xs font-medium text-[#0ab39c]">
                          <Check className="h-3.5 w-3.5" />
                          Varsayılan
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {language.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                          <Check className="h-3.5 w-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                          <X className="h-3.5 w-3.5" />
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{language.sortOrder}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
