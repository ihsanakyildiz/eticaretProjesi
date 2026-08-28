import { access, constants, readdir, readFile, stat, statfs } from "fs/promises";
import os from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getDetectedSitePath } from "@/lib/settings";

export type HealthStatus = "ok" | "warn" | "fail";

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type SystemHealthReport = {
  generatedAt: string;
  overall: HealthStatus;
  checks: HealthCheck[];
  runtime: { label: string; value: string }[];
  process: { label: string; value: string }[];
  resources: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    systemUsedPct: number;
    systemFreeMb: number;
    systemTotalMb: number;
    diskUsedPct: number | null;
    diskFreeGb: number | null;
    diskTotalGb: number | null;
  };
  envFlags: { key: string; configured: boolean; note: string }[];
  database: {
    reachable: boolean;
    latencyMs: number | null;
    engine: string;
    location: string;
    port: string;
    name: string;
    counts: { label: string; value: number }[];
  };
  project: {
    root: string;
    topLevel: { name: string; kind: "dir" | "file" | "marker" }[];
    structure: { path: string; note: string }[];
  };
};

const HIDDEN_ROOT_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.example",
  ".npmrc",
  ".htpasswd",
  "credentials.json",
  "id_rsa",
  "id_ed25519",
]);

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}g ${h}sa ${m}dk`;
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m} dk`;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "ok";
}

function parsePublicAuthUrl(raw: string | undefined) {
  if (!raw) return { configured: false, display: "tanımsız" };
  try {
    const url = new URL(raw);
    return {
      configured: true,
      display: `${url.protocol}//${url.host}`,
      https: url.protocol === "https:",
    };
  } catch {
    return { configured: true, display: "geçersiz URL", https: false };
  }
}

function summarizeDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return {
      engine: "tanımsız",
      location: "tanımsız",
      port: "—",
      name: "—",
    };
  }

  try {
    const normalized = raw.replace(/^mysql:\/\//i, "http://");
    const url = new URL(normalized);
    const host = url.hostname;
    const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
    const dbName = url.pathname.replace(/^\//, "").split("?")[0] || "—";

    return {
      engine: "MySQL / MariaDB",
      location: local ? "yerel döngü (127.0.0.1)" : "uzak sunucu (adres gizlendi)",
      port: url.port || "3306",
      name: dbName,
    };
  } catch {
    return {
      engine: "MySQL / MariaDB",
      location: "yapılandırılmış (ayrıntı gizlendi)",
      port: "—",
      name: "—",
    };
  }
}

async function pathExists(target: string) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isWritable(target: string) {
  try {
    await access(target, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function readPackageVersions(root: string) {
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as {
      version?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.devDependencies, ...pkg.dependencies };
    return {
      app: pkg.version ?? "—",
      next: deps.next ?? "—",
      react: deps.react ?? "—",
      prisma: deps.prisma ?? deps["@prisma/client"] ?? "—",
      nextAuth: deps["next-auth"] ?? "—",
    };
  } catch {
    return {
      app: "—",
      next: "—",
      react: "—",
      prisma: "—",
      nextAuth: "—",
    };
  }
}

async function listSafeTopLevel(root: string) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => !HIDDEN_ROOT_NAMES.has(entry.name))
      .filter((entry) => entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git")
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .map((entry) => ({
        name: entry.name,
        kind: (entry.isDirectory() ? "dir" : "file") as "dir" | "file",
      }));
  } catch {
    return [];
  }
}

async function diskUsage(root: string) {
  try {
    const info = await statfs(root);
    const total = Number(info.bsize) * Number(info.blocks);
    const free = Number(info.bsize) * Number(info.bavail);
    if (!Number.isFinite(total) || total <= 0) {
      return { total: null, free: null, usedPct: null };
    }
    const usedPct = Math.round(((total - free) / total) * 100);
    return { total, free, usedPct };
  } catch {
    return { total: null, free: null, usedPct: null };
  }
}

export async function collectSystemHealth(): Promise<SystemHealthReport> {
  const root = getDetectedSitePath();
  const checks: HealthCheck[] = [];
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const authUrl = parsePublicAuthUrl(process.env.AUTH_URL);
  const secret = process.env.AUTH_SECRET ?? "";
  const dbUrl = process.env.DATABASE_URL;
  const trustHost =
    process.env.AUTH_TRUST_HOST === "true" || process.env.AUTH_TRUST_HOST === "1";

  let dbOk = false;
  let latencyMs: number | null = null;
  let counts: { label: string; value: number }[] = [];

  const pingStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - pingStart;
    dbOk = true;
    const [
      users,
      pages,
      works,
      projects,
      posts,
      menus,
      settings,
      languages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.page.count(),
      prisma.work.count(),
      prisma.project.count(),
      prisma.blogPost.count(),
      prisma.menuGroup.count(),
      prisma.setting.count(),
      prisma.language.count(),
    ]);
    counts = [
      { label: "Kullanıcı", value: users },
      { label: "Sayfa", value: pages },
      { label: "Çalışma", value: works },
      { label: "Proje", value: projects },
      { label: "Blog yazısı", value: posts },
      { label: "Menü grubu", value: menus },
      { label: "Ayar kaydı", value: settings },
      { label: "Dil", value: languages },
    ];

    checks.push({
      id: "db",
      label: "Veritabanı bağlantısı",
      status: latencyMs > 800 ? "warn" : "ok",
      detail:
        latencyMs > 800
          ? `Yanıt ${latencyMs} ms — yavaş`
          : `Yanıt ${latencyMs} ms`,
    });

    checks.push({
      id: "users",
      label: "Admin hesabı",
      status: users > 0 ? "ok" : "fail",
      detail:
        users > 0
          ? `${users} kullanıcı kaydı`
          : "users tablosu boş — seed çalıştırın",
    });
  } catch {
    latencyMs = Date.now() - pingStart;
    checks.push({
      id: "db",
      label: "Veritabanı bağlantısı",
      status: "fail",
      detail: "Sorgu başarısız (ayrıntı gizlendi)",
    });
    checks.push({
      id: "users",
      label: "Admin hesabı",
      status: "fail",
      detail: "Veritabanına ulaşılamadı",
    });
  }

  checks.push({
    id: "auth-secret",
    label: "AUTH_SECRET",
    status: !secret ? "fail" : secret.length < 32 ? "warn" : "ok",
    detail: !secret
      ? "Tanımsız"
      : secret.length < 32
        ? "Tanımlı ancak kısa (en az 32 karakter önerilir)"
        : "Tanımlı",
  });

  checks.push({
    id: "auth-url",
    label: "AUTH_URL",
    status: !authUrl.configured
      ? "fail"
      : nodeEnv === "production" && authUrl.https === false
        ? "warn"
        : "ok",
    detail: authUrl.display,
  });

  checks.push({
    id: "trust-host",
    label: "AUTH_TRUST_HOST",
    status: nodeEnv === "production" && !trustHost ? "warn" : "ok",
    detail: trustHost
      ? "Açık (proxy arkasında gerekli)"
      : nodeEnv === "production"
        ? "Kapalı — Apache/Hestia arkasında giriş 500 verebilir"
        : "Kapalı (geliştirme)",
  });

  const uploadsDir = path.join(root, "public", "uploads");
  const uploadsExists = await pathExists(uploadsDir);
  const uploadsWritable = uploadsExists ? await isWritable(uploadsDir) : false;
  checks.push({
    id: "uploads",
    label: "Yükleme dizini",
    status: uploadsWritable ? "ok" : "warn",
    detail: uploadsWritable
      ? "public/uploads yazılabilir"
      : uploadsExists
        ? "Dizin var, yazma izni yok"
        : "public/uploads bulunamadı",
  });

  const nextBuild = await pathExists(path.join(root, ".next"));
  checks.push({
    id: "build",
    label: "Üretim derlemesi",
    status: nodeEnv === "production" && !nextBuild ? "warn" : "ok",
    detail: nextBuild ? ".next dizini mevcut" : ".next yok (dev veya henüz build edilmedi)",
  });

  checks.push({
    id: "node-env",
    label: "Çalışma ortamı",
    status: "ok",
    detail: nodeEnv,
  });

  const mem = process.memoryUsage();
  const rssMb = mem.rss / (1024 * 1024);
  const memoryStatus: HealthStatus = rssMb >= 768 ? "fail" : rssMb >= 512 ? "warn" : "ok";
  checks.push({
    id: "heap",
    label: "Uygulama belleği",
    status: memoryStatus,
    detail: `RSS ${formatBytes(mem.rss)} · heap ${formatBytes(mem.heapUsed)}`,
  });

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const sysUsedPct = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0;
  checks.push({
    id: "ram",
    label: "Sistem RAM",
    status: sysUsedPct >= 90 ? "warn" : "ok",
    detail: `%${sysUsedPct} kullanım (${formatBytes(totalMem - freeMem)} / ${formatBytes(totalMem)})`,
  });

  const disk = await diskUsage(root);
  if (disk.usedPct != null) {
    checks.push({
      id: "disk",
      label: "Disk (proje birimi)",
      status: disk.usedPct >= 90 ? "warn" : "ok",
      detail: `%${disk.usedPct} kullanım`,
    });
  } else {
    checks.push({
      id: "disk",
      label: "Disk (proje birimi)",
      status: "warn",
      detail: "Kullanım okunamadı",
    });
  }

  const versions = await readPackageVersions(root);
  const topLevel = await listSafeTopLevel(root);
  const markers: { name: string; kind: "marker" }[] = [];
  if (await pathExists(path.join(root, "node_modules"))) {
    markers.push({ name: "node_modules (bağımlılıklar yüklü)", kind: "marker" });
  }
  if (nextBuild) {
    markers.push({ name: ".next (derleme çıktısı)", kind: "marker" });
  }
  if (await pathExists(path.join(root, ".git"))) {
    markers.push({ name: ".git (sürüm kontrolü)", kind: "marker" });
  }

  let prismaSchema = false;
  try {
    const st = await stat(path.join(root, "prisma", "schema.prisma"));
    prismaSchema = st.isFile();
  } catch {
    prismaSchema = false;
  }
  checks.push({
    id: "schema",
    label: "Prisma şeması",
    status: prismaSchema ? "ok" : "fail",
    detail: prismaSchema ? "prisma/schema.prisma mevcut" : "Şema dosyası yok",
  });

  const dbSummary = summarizeDatabaseUrl(dbUrl);

  return {
    generatedAt: new Date().toISOString(),
    overall: worstStatus(checks.map((item) => item.status)),
    checks,
    runtime: [
      { label: "Uygulama sürümü", value: versions.app },
      { label: "Next.js", value: versions.next },
      { label: "React", value: versions.react },
      { label: "Prisma", value: versions.prisma },
      { label: "Auth.js", value: versions.nextAuth },
      { label: "Node.js", value: process.version },
      { label: "Platform", value: `${os.platform()} ${os.arch()}` },
      { label: "CPU çekirdek", value: String(os.cpus().length) },
      { label: "Saat dilimi", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
    ],
    process: [
      { label: "Proje kökü", value: root },
      { label: "NODE_ENV", value: nodeEnv },
      { label: "Süreç uptime", value: formatDuration(process.uptime()) },
      { label: "Sistem uptime", value: formatDuration(os.uptime()) },
    ],
    resources: {
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      systemUsedPct: sysUsedPct,
      systemFreeMb: Math.round(freeMem / (1024 * 1024)),
      systemTotalMb: Math.round(totalMem / (1024 * 1024)),
      diskUsedPct: disk.usedPct,
      diskFreeGb:
        disk.free != null ? Number((disk.free / (1024 * 1024 * 1024)).toFixed(2)) : null,
      diskTotalGb:
        disk.total != null ? Number((disk.total / (1024 * 1024 * 1024)).toFixed(2)) : null,
    },
    envFlags: [
      { key: "DATABASE_URL", configured: Boolean(dbUrl), note: "Değer gösterilmez" },
      { key: "AUTH_SECRET", configured: Boolean(secret), note: "Değer gösterilmez" },
      { key: "AUTH_URL", configured: authUrl.configured, note: authUrl.display },
      { key: "AUTH_TRUST_HOST", configured: trustHost, note: trustHost ? "true" : "false" },
      {
        key: "ADMIN_EMAIL",
        configured: Boolean(process.env.ADMIN_EMAIL),
        note: "Yalnızca seed; adres gösterilmez",
      },
      {
        key: "ADMIN_PASSWORD",
        configured: Boolean(process.env.ADMIN_PASSWORD),
        note: "Değer gösterilmez",
      },
    ],
    database: {
      reachable: dbOk,
      latencyMs,
      engine: dbSummary.engine,
      location: dbSummary.location,
      port: dbSummary.port,
      name: dbSummary.name,
      counts,
    },
    project: {
      root,
      topLevel: [...topLevel, ...markers],
      structure: [
        { path: "src/app/(site)", note: "Ziyaretçi sayfaları" },
        { path: "src/app/admin", note: "CMS (login + panel)" },
        { path: "src/app/api", note: "Auth ve yükleme API" },
        { path: "src/components/admin", note: "Yönetim arayüzü" },
        { path: "src/components/site", note: "Ön yüz bileşenleri" },
        { path: "src/lib", note: "Prisma, cache, SEO, sağlık" },
        { path: "src/config", note: "Menü ve ayar tanımları" },
        { path: "prisma/schema.prisma", note: "Veri modeli" },
        { path: "public/uploads", note: "Yüklenen görseller" },
        { path: "messages", note: "Çeviri JSON" },
      ],
    },
  };
}
