import type { Metadata } from "next";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  FolderTree,
  Database,
  Cpu,
  Shield,
} from "lucide-react";
import { collectSystemHealth, type HealthStatus } from "@/lib/system-health";
import { SystemHealthRefresh } from "./refresh-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sistem Sağlığı",
  description: "Proje yapısı, sunucu ve uygulama sağlığı",
};

const statusLabel: Record<HealthStatus, string> = {
  ok: "Sağlıklı",
  warn: "Uyarı",
  fail: "Kritik",
};

const statusClass: Record<HealthStatus, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  fail: "bg-rose-50 text-rose-700 border-rose-200",
};

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-rose-600" />;
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function SystemHealthPage() {
  const report = await collectSystemHealth();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Activity className="h-6 w-6 text-[#0ab39c]" />
              Sistem Sağlığı
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Proje yapısı, çalışma zamanı, kaynak kullanımı ve veritabanı durumu. Gizli anahtarlar,
              bağlantı dizeleri, hostname, PID ve ortam değişkeni değerleri gösterilmez.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Son tarama: {formatWhen(report.generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${statusClass[report.overall]}`}
            >
              <StatusIcon status={report.overall} />
              Genel: {statusLabel[report.overall]}
            </span>
            <SystemHealthRefresh generatedAt={report.generatedAt} />
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{check.label}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusClass[check.status]}`}
              >
                <StatusIcon status={check.status} />
                {statusLabel[check.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{check.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#e9ebec] px-5 py-4">
            <Cpu className="h-4 w-4 text-[#405189]" />
            <h2 className="text-base font-semibold text-slate-800">Çalışma zamanı</h2>
          </div>
          <dl className="divide-y divide-[#e9ebec]">
            {report.runtime.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-2.5">
                <dt className="text-sm text-slate-500">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#e9ebec] px-5 py-4">
            <Server className="h-4 w-4 text-[#405189]" />
            <h2 className="text-base font-semibold text-slate-800">Süreç ve kaynaklar</h2>
          </div>
          <dl className="divide-y divide-[#e9ebec]">
            {report.process.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-2.5">
                <dt className="shrink-0 text-sm text-slate-500">{row.label}</dt>
                <dd className="break-all text-right text-sm font-medium text-slate-800">
                  {row.value}
                </dd>
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 px-5 py-2.5">
              <dt className="text-sm text-slate-500">RSS bellek</dt>
              <dd className="text-sm font-medium text-slate-800">{report.resources.rssMb} MB</dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-2.5">
              <dt className="text-sm text-slate-500">Sistem RAM boş</dt>
              <dd className="text-sm font-medium text-slate-800">
                {report.resources.systemFreeMb} / {report.resources.systemTotalMb} MB
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-2.5">
              <dt className="text-sm text-slate-500">Disk boş / toplam</dt>
              <dd className="text-sm font-medium text-slate-800">
                {report.resources.diskFreeGb != null && report.resources.diskTotalGb != null
                  ? `${report.resources.diskFreeGb} / ${report.resources.diskTotalGb} GB`
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#e9ebec] px-5 py-4">
          <Shield className="h-4 w-4 text-[#405189]" />
          <h2 className="text-base font-semibold text-slate-800">Ortam değişkenleri</h2>
        </div>
        <p className="px-5 pt-3 text-xs text-slate-400">
          Yalnızca tanımlı / tanımsız bilgisi. Şifre, secret ve bağlantı dizesi yazılmaz.
        </p>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="pb-2 font-semibold">Anahtar</th>
                <th className="pb-2 font-semibold">Durum</th>
                <th className="pb-2 font-semibold">Not</th>
              </tr>
            </thead>
            <tbody>
              {report.envFlags.map((flag) => (
                <tr key={flag.key} className="border-t border-[#e9ebec]">
                  <td className="py-2.5">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{flag.key}</code>
                  </td>
                  <td className="py-2.5">
                    {flag.configured ? (
                      <span className="text-emerald-700">Tanımlı</span>
                    ) : (
                      <span className="text-rose-600">Eksik</span>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-500">{flag.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#e9ebec] px-5 py-4">
          <Database className="h-4 w-4 text-[#405189]" />
          <h2 className="text-base font-semibold text-slate-800">Veritabanı</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Durum" value={report.database.reachable ? "Ulaşılabilir" : "Kapalı"} />
          <InfoTile
            label="Gecikme"
            value={report.database.latencyMs != null ? `${report.database.latencyMs} ms` : "—"}
          />
          <InfoTile label="Motor" value={report.database.engine} />
          <InfoTile label="Konum" value={report.database.location} />
          <InfoTile label="Port" value={report.database.port} />
          <InfoTile label="Veritabanı adı" value={report.database.name} />
        </div>
        {report.database.counts.length > 0 ? (
          <div className="grid gap-3 border-t border-[#e9ebec] p-5 sm:grid-cols-2 lg:grid-cols-4">
            {report.database.counts.map((row) => (
              <div key={row.label} className="rounded-md bg-[#f3f6f9] px-3 py-3">
                <p className="text-xs text-slate-500">{row.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">{row.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#e9ebec] px-5 py-4">
          <FolderTree className="h-4 w-4 text-[#405189]" />
          <h2 className="text-base font-semibold text-slate-800">Proje yapısı</h2>
        </div>
        <p className="px-5 pt-4 text-xs text-slate-400">
          Kök: <span className="break-all font-medium text-slate-600">{report.project.root}</span>
        </p>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Kök dizin (hassas dosyalar hariç)
            </p>
            <ul className="space-y-1 rounded-md border border-[#e9ebec] bg-[#f8fafc] p-3 font-mono text-xs text-slate-700">
              {report.project.topLevel.map((entry) => (
                <li key={entry.name}>
                  {entry.kind === "dir" ? "[dizin] " : entry.kind === "marker" ? "[ok] " : "[dosya] "}
                  {entry.name}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Mimari
            </p>
            <ul className="space-y-2">
              {report.project.structure.map((item) => (
                <li key={item.path} className="flex flex-col gap-0.5">
                  <code className="text-xs text-[#405189]">{item.path}</code>
                  <span className="text-xs text-slate-500">{item.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
