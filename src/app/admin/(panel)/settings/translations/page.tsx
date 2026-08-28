import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Çeviriler",
  description: "Çeviri kayıtlarını yönetin",
};

type TranslationsPageProps = {
  searchParams: Promise<{ language?: string; namespace?: string }>;
};

export default async function TranslationsPage({ searchParams }: TranslationsPageProps) {
  const params = await searchParams;
  const languages = await prisma.language.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const selectedLanguageCode = params.language ?? languages.find((l) => l.isDefault)?.code ?? "tr";
  const selectedLanguage = languages.find((l) => l.code === selectedLanguageCode) ?? languages[0];

  const namespaces = await prisma.translation.findMany({
    where: selectedLanguage ? { languageId: selectedLanguage.id } : undefined,
    distinct: ["namespace"],
    select: { namespace: true },
    orderBy: { namespace: "asc" },
  });

  const selectedNamespace = params.namespace ?? namespaces[0]?.namespace;

  const translations = selectedLanguage
    ? await prisma.translation.findMany({
        where: {
          languageId: selectedLanguage.id,
          ...(selectedNamespace ? { namespace: selectedNamespace } : {}),
        },
        orderBy: [{ namespace: "asc" }, { key: "asc" }],
        take: 200,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Çeviriler</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Veritabanındaki çeviri kayıtları, varsayılan <code className="text-xs">messages/*.json</code>{" "}
          metinlerinin üzerine yazılır. Düzenleme arayüzü bir sonraki adımda genişletilecek.
        </p>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <form className="flex flex-wrap gap-3" method="get">
          <div>
            <label htmlFor="language" className="mb-1 block text-xs font-medium text-slate-500">
              Dil
            </label>
            <select
              id="language"
              name="language"
              defaultValue={selectedLanguageCode}
              className="rounded-md border border-[#e9ebec] bg-[#f3f6f9] px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              {languages.map((language) => (
                <option key={language.id} value={language.code}>
                  {language.name} ({language.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="namespace" className="mb-1 block text-xs font-medium text-slate-500">
              Namespace
            </label>
            <select
              id="namespace"
              name="namespace"
              defaultValue={selectedNamespace ?? ""}
              className="min-w-48 rounded-md border border-[#e9ebec] bg-[#f3f6f9] px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="">Tümü</option>
              {namespaces.map((item) => (
                <option key={item.namespace} value={item.namespace}>
                  {item.namespace}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-[#405189] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#364574]"
            >
              Filtrele
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e9ebec] bg-[#f3f6f9] text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-semibold">Namespace</th>
                <th className="px-5 py-3 font-semibold">Anahtar</th>
                <th className="px-5 py-3 font-semibold">Değer</th>
              </tr>
            </thead>
            <tbody>
              {translations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                    Bu filtre için çeviri kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                translations.map((item) => (
                  <tr key={item.id} className="border-b border-[#e9ebec] last:border-0 align-top">
                    <td className="px-5 py-3.5">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {item.namespace}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{item.key}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.value}</td>
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
