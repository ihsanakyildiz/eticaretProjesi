"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Rss,
  Save,
  ScrollText,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { useCan, useCanWrite } from "@/components/admin/admin-permissions";
import {
  FeedSyncWarningBadge,
  FeedSyncWarningDetailAlert,
  FeedSyncWarningListAlert,
} from "@/components/admin/feed-sync-warning-alert";
import { IMPORT_PATHS } from "./import-paths";
import { FeedMappingTable } from "./feed-mapping-table";
import {
  emptyXmlFeedForm,
  XML_FEED_INTERVALS,
  XML_FEED_MATCH_BY,
  XML_FEED_PRICE_ROUNDS,
  XML_FEED_TARGET_FIELDS,
  mappingFilterIds,
  mergeFilterValueAliases,
  xmlFeedIntervalLabel,
  xmlFeedMatchByLabel,
  xmlFeedOutOfStockLabel,
  xmlFeedPriceRoundLabel,
  xmlFeedRunStatusLabel,
  xmlFeedTargetLabel,
  xmlFeedFilterTargetKey,
  XML_FEED_OUT_OF_STOCK,
  XML_FEED_RUN_PAGE_SIZE,
  discoveryFromPreview,
  feedToForm,
  mappingHasTarget,
  mergeValueAliases,
  previewFromDiscovery,
  splitFeedTagsByVariant,
  toggleUpdateField,
  upsertValueAlias,
  type XmlFeedCategoryAlias,
  type XmlFeedFilterCatalogItem,
  type XmlFeedFormValues,
  type XmlFeedLookupOption,
  type XmlFeedMappedField,
  type XmlFeedPreviewResult,
  type XmlFeedTagPreview,
  type XmlFeedTargetKey,
  type XmlProductFeedRunSummary,
  type XmlProductFeedSummary,
} from "@/lib/xml-product-feed-shared";
import {
  deleteXmlFeedAction,
  getXmlFeedProgressAction,
  listXmlFeedProgressAction,
  listXmlFeedRunsAction,
  listXmlFeedsAction,
  previewXmlFeedAction,
  runXmlFeedAction,
  saveXmlFeedAction,
  toggleXmlFeedAction,
} from "./xml-actions";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

const FIELD_GROUPS = [
  { id: "kimlik", label: "Kimlik" },
  { id: "fiyat", label: "Fiyat" },
  { id: "stok", label: "Stok" },
  { id: "varyant", label: "Varyant" },
  { id: "sınıflama", label: "Sınıflama" },
  { id: "içerik", label: "İçerik" },
  { id: "lojistik", label: "Lojistik" },
] as const;

function tagLabel(path: string) {
  const last = path.split(".").pop() ?? path;
  return last.startsWith("@") ? last : `<${last}>`;
}

function isXmlProductIdPath(path: string) {
  const last = (path.split(".").pop() ?? path).replace(/^@/, "");
  const token = last.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "");
  return token === "productid" || token === "urunid" || token === "xmlid" || token === "supplierproductid";
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR");
}

function XmlSyncProgressBar({ feed }: { feed: XmlProductFeedSummary }) {
  const total = Math.max(1, feed.runningItemCount);
  const done = Math.min(feed.runningCursor, total);
  const percent = feed.runningItemCount > 0 ? Math.min(100, Math.round((done / total) * 100)) : 8;

  return (
    <div className="sticky top-16 z-20 rounded-lg border border-[#405189]/20 bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Sunucuda senkronlanıyor</p>
        <p className="text-sm text-slate-500">
          {feed.runningItemCount > 0 ? `${feed.runningCursor} / ${feed.runningItemCount}` : "Kuyruk hazırlanıyor…"}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#0ab39c] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">{feed.lastMessage || "XML okunuyor…"}</p>
      <p className="mt-1 text-xs text-slate-400">
        Aktarım tarayıcıya bağlı değildir. Sayfayı kapatabilir, internetiniz kesse veya bilgisayarı
        kapatsanız bile sunucu (XAMPP / Next) açık kaldığı sürece devam eder. Sunucu kapanırsa
        yeniden açılınca kaldığı yerden sürer.
      </p>
    </div>
  );
}

export function XmlFeedListPanel({ initialFeeds }: { initialFeeds: XmlProductFeedSummary[] }) {
  const canWrite = useCanWrite("products");
  const canDelete = useCan("products", "delete");
  const [feeds, setFeeds] = useState(initialFeeds);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setFeeds(initialFeeds);
  }, [initialFeeds]);

  useEffect(() => {
    const running = feeds.some((feed) => feed.running);
    if (!running && !feeds.some((feed) => feed.isActive)) return;
    const timer = window.setInterval(() => {
      void listXmlFeedProgressAction().then((result) => {
        if (!result.progress) return;
        setFeeds((current) =>
          current.map((feed) => {
            const progress = result.progress?.find((item) => item.id === feed.id);
            return progress ? { ...feed, ...progress } : feed;
          }),
        );
      });
    }, running ? 4000 : 30000);
    return () => window.clearInterval(timer);
  }, [feeds]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Rss className="mt-0.5 h-5 w-5 text-[#405189]" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">XML tedarik kaynakları</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Senkron Excel yükleme gibi sunucuda çalışır. Tarayıcıyı kapatmanız işi durdurmaz.
                Her kaynağın eşlemesi kendi sayfasındadır. Çalışmasını istemediğiniz firmayı Aktif
                sütunundan Pasif yapın.
              </p>
            </div>
          </div>
          {canWrite ? (
            <Link
              href={IMPORT_PATHS.xmlNew}
              className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574]"
            >
              <Plus className="h-4 w-4" />
              XML kaynağı ekle
            </Link>
          ) : null}
        </div>
      </div>

      {feeds.some((feed) => feed.running)
        ? feeds.filter((feed) => feed.running).map((feed) => <XmlSyncProgressBar key={feed.id} feed={feed} />)
        : null}

      <FeedSyncWarningListAlert
        feeds={feeds.map((feed) => ({
          id: feed.id,
          name: feed.name,
          href: IMPORT_PATHS.xmlFeed(feed.id),
          supplierName: feed.supplierName,
          lastSyncWarnings: feed.lastSyncWarnings,
        }))}
      />

      <FeedList
        feeds={feeds}
        canWrite={canWrite}
        canDelete={canDelete}
        pending={pending}
        onToggle={(id, isActive) => {
          start(() => {
            void toggleXmlFeedAction(id, isActive).then((result) => {
              if (result.feeds) setFeeds(result.feeds);
              if (result.error) setError(result.error);
            });
          });
        }}
        onRun={(id) => {
          start(() => {
            void runXmlFeedAction(id).then((result) => {
              if (result.error) setError(result.error);
              void listXmlFeedsAction().then((listed) => {
                if (listed.feeds) setFeeds(listed.feeds);
              });
            });
          });
        }}
        onDelete={(id) => {
          if (!window.confirm("Bu XML kaynağını silmek istiyor musunuz?")) return;
          start(() => {
            void deleteXmlFeedAction(id).then((result) => {
              if (result.feeds) setFeeds(result.feeds);
              if (result.error) setError(result.error);
            });
          });
        }}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

export function XmlFeedEditorPanel({
  initialFeed,
  categories,
  brands,
  suppliers,
  filters,
}: {
  initialFeed: XmlProductFeedSummary | null;
  categories: XmlFeedLookupOption[];
  brands: XmlFeedLookupOption[];
  suppliers: XmlFeedLookupOption[];
  filters: XmlFeedFilterCatalogItem[];
}) {
  const router = useRouter();
  const canWrite = useCanWrite("products");
  const [feed, setFeed] = useState(initialFeed);
  const [editor, setEditor] = useState<XmlFeedFormValues>(() =>
    initialFeed ? feedToForm(initialFeed) : emptyXmlFeedForm(),
  );
  const [preview, setPreview] = useState<XmlFeedPreviewResult | null>(() =>
    initialFeed?.discovery ? previewFromDiscovery(initialFeed.discovery, initialFeed.mapping) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [previewPending, startPreview] = useTransition();

  useEffect(() => {
    setFeed(initialFeed);
    if (initialFeed) {
      setEditor(feedToForm(initialFeed));
      setPreview(
        initialFeed.discovery ? previewFromDiscovery(initialFeed.discovery, initialFeed.mapping) : null,
      );
    }
  }, [initialFeed?.id]);

  const watchingId = editor.id ?? feed?.id;
  useEffect(() => {
    if (!watchingId) return;
    const feedId = watchingId;
    let cancelled = false;
    function refresh() {
      void getXmlFeedProgressAction(feedId).then((result) => {
        if (cancelled || !result.progress) return;
        setFeed((current) => (current ? { ...current, ...result.progress } : current));
      });
    }
    refresh();
    if (!feed?.running) {
      return () => {
        cancelled = true;
      };
    }
    const timer = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [watchingId, feed?.running]);

  function updateEditor<K extends keyof XmlFeedFormValues>(key: K, value: XmlFeedFormValues[K]) {
    setEditor((current) => ({ ...current, [key]: value }));
  }

  function updateMapping(xmlPath: string, field: XmlFeedMappedField | "") {
    setEditor((current) => {
      const mapping = { ...current.mapping };
      if (!field) delete mapping[xmlPath];
      else mapping[xmlPath] = field;
      return { ...current, mapping };
    });
  }

  function fetchPreview() {
    setError(null);
    startPreview(() => {
      void previewXmlFeedAction({
        url: editor.url,
        httpUser: editor.httpUser,
        httpPass: editor.httpPass,
        keepStoredPass: Boolean(editor.id),
        feedId: editor.id,
        itemPath: editor.itemPath,
        variantPath: editor.variantPath,
        mapping: editor.mapping,
        categoryAliases: editor.categoryAliases,
        brandAliases: editor.brandAliases,
        filterValueAliases: editor.filterValueAliases,
      }).then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        if (!result.preview) return;
        setPreview(result.preview);
        setEditor((current) => {
          const mapping = { ...result.preview!.suggestedMapping };
          for (const [path, field] of Object.entries(current.mapping)) {
            mapping[path] = isXmlProductIdPath(path) && field === "productKey" ? "externalId" : field;
          }
          const matchBy =
            current.matchBy === "BARCODE" &&
            mappingHasTarget(mapping, "externalId") &&
            !mappingHasTarget(mapping, "barcode")
              ? "PRODUCT_ID"
              : current.matchBy;
          return {
            ...current,
            itemPath: current.itemPath || result.preview!.itemPath,
            variantPath: current.variantPath || result.preview!.variantPath,
            discovery: discoveryFromPreview(result.preview!),
            mapping,
            matchBy,
            categoryAliases: mergeValueAliases(
              current.categoryAliases,
              result.preview!.xmlCategories,
              categories,
            ),
            brandAliases: mergeValueAliases(current.brandAliases, result.preview!.xmlBrands, brands),
            filterValueAliases: mergeFilterValueAliases(
              current.filterValueAliases,
              result.preview!.xmlFilterValues ?? {},
              filters,
            ),
          };
        });
      });
    });
  }

  function saveEditor() {
    setError(null);
    const mapping = { ...editor.mapping };
    for (const [path, field] of Object.entries(mapping)) {
      if (isXmlProductIdPath(path) && field === "productKey") mapping[path] = "externalId";
    }
    const wasNew = !editor.id;
    const payload = {
      ...editor,
      mapping,
      discovery: preview ? discoveryFromPreview(preview) : editor.discovery,
    };
    start(() => {
      void saveXmlFeedAction(payload).then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        if (!result.feed) return;
        setNotice("Kaynak kaydedildi. Zamanlanmış senkron sıraya alındı.");
        setFeed(result.feed);
        setEditor(feedToForm(result.feed));
        setPreview(
          result.feed.discovery
            ? previewFromDiscovery(result.feed.discovery, result.feed.mapping)
            : preview,
        );
        if (wasNew) {
          router.replace(IMPORT_PATHS.xmlFeed(result.feed.id));
        }
      });
    });
  }

  const xmlTags = useMemo<XmlFeedTagPreview[]>(() => {
    const fromPreview = preview?.xmlTags ?? editor.discovery?.xmlTags ?? [];
    const seen = new Set(fromPreview.map((tag) => tag.path));
    const extra = Object.keys(editor.mapping)
      .filter((path) => !seen.has(path))
      .map((path) => ({ path, sample: "" }));
    return [...fromPreview, ...extra];
  }, [preview, editor.discovery, editor.mapping]);

  return (
    <>
      {feed?.running ? <XmlSyncProgressBar feed={feed} /> : null}
    <FeedEditor
      editor={editor}
      preview={preview}
      xmlTags={xmlTags}
      pending={pending}
      previewPending={previewPending}
      error={error}
      notice={notice}
      canWrite={canWrite}
      categories={categories}
      brands={brands}
      suppliers={suppliers}
      filters={filters}
      editingFeed={feed}
      onChange={updateEditor}
      onMapping={updateMapping}
      onPreview={fetchPreview}
      onSave={saveEditor}
      onRun={() => {
        if (!editor.id) return;
        start(() => {
          void runXmlFeedAction(editor.id!).then((result) => {
            if (result.error) setError(result.error);
            if (result.feed) {
              setFeed(result.feed);
              setNotice("Senkron sunucuya alındı. Tarayıcıyı kapatabilirsiniz.");
            }
          });
        });
      }}
    />
    </>
  );
}

function FeedList({
  feeds,
  canWrite,
  canDelete,
  pending,
  onToggle,
  onRun,
  onDelete,
}: {
  feeds: XmlProductFeedSummary[];
  canWrite: boolean;
  canDelete: boolean;
  pending: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (feeds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <Rss className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          Henüz XML kaynağı yok. A veya B firması için ayrı adres ve eşleme ekleyin.
        </p>
        <Link
          href={IMPORT_PATHS.xmlNew}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#405189]"
        >
          XML kaynağı ekle
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Kaynak</th>
            <th className="px-4 py-3">Eşleme</th>
            <th className="px-4 py-3">Aralık</th>
            <th className="px-4 py-3">Son çalışma</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Aktif</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef0f2]">
          {feeds.map((feed) => (
            <tr key={feed.id} className="align-top">
              <td className="px-4 py-3">
                <Link href={IMPORT_PATHS.xmlFeed(feed.id)} className="text-left">
                  <p className="font-medium text-slate-800 hover:text-[#405189]">{feed.name}</p>
                  <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{feed.url}</p>
                  {feed.supplierName ? (
                    <p className="mt-1 text-xs text-slate-400">{feed.supplierName}</p>
                  ) : null}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{xmlFeedMatchByLabel(feed.matchBy)}</td>
              <td className="px-4 py-3 text-slate-600">{xmlFeedIntervalLabel(feed.intervalMinutes)}</td>
              <td className="px-4 py-3 text-slate-600">
                <p>{formatWhen(feed.lastRunAt)}</p>
                {feed.lastMessage ? <p className="mt-1 text-xs text-slate-400">{feed.lastMessage}</p> : null}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge feed={feed} />
                  <FeedSyncWarningBadge report={feed.lastSyncWarnings} />
                </div>
              </td>
              <td className="px-4 py-3">
                {canWrite ? (
                  <button
                    type="button"
                    disabled={pending}
                    title={feed.isActive ? "Pasife al" : "Aktife al"}
                    onClick={() => onToggle(feed.id, !feed.isActive)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      feed.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {feed.isActive ? "Aktif" : "Pasif"}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">{feed.isActive ? "Aktif" : "Pasif"}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link
                    href={IMPORT_PATHS.xmlFeed(feed.id)}
                    className="inline-flex items-center rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Eşleme
                  </Link>
                  {canWrite ? (
                    <button
                      type="button"
                      disabled={pending || feed.running || !feed.isActive}
                      title={!feed.isActive ? "Pasif kaynak çalıştırılamaz" : undefined}
                      onClick={() => onRun(feed.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {feed.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Çalıştır
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(feed.id)}
                      className="inline-flex items-center rounded-md border border-rose-100 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ feed }: { feed: XmlProductFeedSummary }) {
  if (feed.running) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Çalışıyor
      </span>
    );
  }
  if (feed.lastStatus === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
        <XCircle className="h-3 w-3" />
        Hata
      </span>
    );
  }
  if (feed.lastStatus === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Tamam
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
      <Clock3 className="h-3 w-3" />
      Bekliyor
    </span>
  );
}

function FeedEditor({
  editor,
  preview,
  xmlTags,
  pending,
  previewPending,
  error,
  notice,
  canWrite,
  categories,
  brands,
  suppliers,
  filters,
  editingFeed,
  onChange,
  onMapping,
  onPreview,
  onSave,
  onRun,
}: {
  editor: XmlFeedFormValues;
  preview: XmlFeedPreviewResult | null;
  xmlTags: XmlFeedTagPreview[];
  pending: boolean;
  previewPending: boolean;
  error: string | null;
  notice: string | null;
  canWrite: boolean;
  categories: XmlFeedLookupOption[];
  brands: XmlFeedLookupOption[];
  suppliers: XmlFeedLookupOption[];
  filters: XmlFeedFilterCatalogItem[];
  editingFeed: XmlProductFeedSummary | null;
  onChange: <K extends keyof XmlFeedFormValues>(key: K, value: XmlFeedFormValues[K]) => void;
  onMapping: (xmlPath: string, field: XmlFeedMappedField | "") => void;
  onPreview: () => void;
  onSave: () => void;
  onRun: () => void;
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const groupedFields = useMemo(() => {
    const groups: Array<{
      id: string;
      label: string;
      fields: Array<{ key: XmlFeedMappedField; header: string }>;
    }> = FIELD_GROUPS.map((group) => ({
      ...group,
      fields: XML_FEED_TARGET_FIELDS.filter((field) => field.group === group.id && field.key !== "filters").map(
        (field) => ({ key: field.key as XmlFeedMappedField, header: field.header }),
      ),
    }));
    if (filters.length > 0) {
      groups.push({
        id: "filtreler",
        label: "Ürün filtreleri",
        fields: filters.map((filter) => ({
          key: xmlFeedFilterTargetKey(filter.id),
          header: filter.name,
        })),
      });
    }
    return groups;
  }, [filters]);
  const mappedFilterIds = mappingFilterIds(editor.mapping);
  const variantPath = editor.variantPath.trim() || preview?.variantPath || "";
  const { product: productTags, variant: variantTags } = splitFeedTagsByVariant(xmlTags, variantPath);

  return (
    <div className="space-y-5">
      <FeedSyncWarningDetailAlert
        report={editingFeed?.lastSyncWarnings}
        companyName={editingFeed?.supplierName || editor.name}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={IMPORT_PATHS.xml} className="text-sm font-medium text-[#405189]">
          ← Kaynak listesine dön
        </Link>
        <div className="flex flex-wrap gap-2">
          {editor.id && canWrite ? (
            <button
              type="button"
              disabled={pending || Boolean(editingFeed?.running) || !editor.isActive}
              title={!editor.isActive ? "Pasif kaynak çalıştırılamaz" : undefined}
              onClick={onRun}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {editingFeed?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Şimdi çalıştır
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              disabled={pending}
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          ) : null}
        </div>
      </div>

      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">1. Kaynak</h3>
        <AdminSwitch
          className="mt-4 w-full max-w-xl"
          label="Kaynak aktif"
          description="Pasifken zamanlanmış senkron ve Şimdi çalıştır durur. Eşleme ve kayıt yapılabilir."
          checked={editor.isActive}
          onChange={(checked) => onChange("isActive", checked)}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Firma / kaynak adı</span>
            <input
              className={inputClass}
              value={editor.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="A Firması"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Tedarikçi kaydı</span>
            <select
              className={inputClass}
              value={editor.supplierId}
              onChange={(event) => onChange("supplierId", event.target.value)}
            >
              <option value="">Seçilmedi</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-600">XML adresi</span>
            <input
              className={inputClass}
              value={editor.url}
              onChange={(event) => onChange("url", event.target.value)}
              placeholder="https://tedarikci.com/urunler.xml"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">HTTP kullanıcı (isteğe bağlı)</span>
            <input
              className={inputClass}
              value={editor.httpUser}
              onChange={(event) => onChange("httpUser", event.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">HTTP parola</span>
            <input
              type="password"
              className={inputClass}
              value={editor.httpPass}
              onChange={(event) => onChange("httpPass", event.target.value)}
              placeholder={editor.id ? "Değiştirmek için yazın" : ""}
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            disabled={previewPending || !editor.url.trim()}
            onClick={onPreview}
            className="inline-flex items-center gap-2 rounded-md border border-[#405189] bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-40"
          >
            {previewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            XML’i çek ve alanları keşfet
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">2. Alan eşleme</h3>
        <p className="mt-1 text-sm text-slate-500">
          XML’i çekince alanlar iki tabloya ayrılır: ürün (ortak) ve varyant (her SKU). Örnek:{" "}
          <code className="rounded bg-slate-100 px-1">&lt;UrunAdi&gt;</code> → Ürün adı,{" "}
          <code className="rounded bg-slate-100 px-1">UrunSecenek.Secenek.StokKodu</code> → SKU,{" "}
          <code className="rounded bg-slate-100 px-1">Secenek.Ebat</code> /{" "}
          <code className="rounded bg-slate-100 px-1">Ozellik</code> → beden, renk, ebat. Birden fazla
          görsel etiketi aynı “Görseller” alanına seçilebilir.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">Ürün düğümü (item path)</span>
          <input
            className={inputClass}
            value={editor.itemPath}
            onChange={(event) => onChange("itemPath", event.target.value)}
            placeholder="Urunler.Urun"
            list="xml-item-path-options"
          />
          <datalist id="xml-item-path-options">
            {preview?.itemPath ? <option value={preview.itemPath} /> : null}
          </datalist>
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-600">Varyant dizisi (opsiyonel)</span>
          <input
            className={inputClass}
            value={editor.variantPath}
            onChange={(event) => onChange("variantPath", event.target.value)}
            placeholder="UrunSecenek.Secenek"
            list="xml-variant-path-options"
          />
          <datalist id="xml-variant-path-options">
            {(preview?.variantPathCandidates?.length
              ? preview.variantPathCandidates
              : preview?.variantPath
                ? [preview.variantPath]
                : []
            ).map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-slate-500">
            İç içe XML’de her <code className="rounded bg-slate-100 px-1">&lt;Secenek&gt;</code> /{" "}
            <code className="rounded bg-slate-100 px-1">&lt;Variant&gt;</code> ayrı SKU olur. Üst
            düğüm ürün adı / kategori; alt düğüm barkod, fiyat, stok ve ebat.{" "}
            <code className="rounded bg-slate-100 px-1">&lt;varyant&gt;</code> bir dizi adı değil, ebat
            metni olabilir. Düz XML’de (her SKU ayrı ürün satırı) bu alanı boş bırakıp «Ürün kodu»
            ile gruplayın.
          </span>
        </label>
        {preview ? (
          <p className="mt-2 text-xs text-slate-500">
            {preview.itemCount} ürün satırı bulundu
            {preview.variantRowCount > preview.itemCount
              ? ` · ${preview.variantRowCount} varyant SKU`
              : ""}
            . {preview.xmlTags.length} XML etiketi listelendi.
          </p>
        ) : null}

        {xmlTags.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#e9ebec] px-4 py-8 text-center text-sm text-slate-500">
            Etiketleri görmek için önce XML adresini çekin.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            <FeedMappingTable
              title="Ürün alanları"
              hint="Tüm SKU’larda ortak: ad, kategori, marka, açıklama ve ürün filtreleri."
              pathHeader="XML etiketi"
              pathStyle="xml"
              tags={productTags}
              mapping={editor.mapping}
              groupedFields={groupedFields}
              onMapping={onMapping}
            />
            {variantTags.length > 0 ? (
              <FeedMappingTable
                title={`Varyant alanları (${variantPath})`}
                hint="Her alt etiket ayrı SKU. StokKodu / Barkod / Satış / İndirimli / Stok / Ebat veya Ozellik buradan bağlanır. Ozellikler otomatik okunur."
                pathHeader="XML etiketi"
                pathStyle="xml"
                tags={variantTags}
                mapping={editor.mapping}
                groupedFields={groupedFields}
                onMapping={onMapping}
              />
            ) : variantPath ? (
              <p className="rounded-md border border-dashed border-[#e9ebec] px-4 py-3 text-sm text-slate-500">
                Varyant yolu seçili ama bu yolda alt etiket görünmedi. XML’i yeniden çekin veya yolu
                (ör. UrunSecenek.Secenek, Variants.Variant) kontrol edin.
              </p>
            ) : null}
          </div>
        )}

        {preview?.sampleRows.length ? (
          <div className="mt-5 overflow-x-auto rounded-md border border-[#eef0f2]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Ad</th>
                  <th className="px-3 py-2">Varyant</th>
                  <th className="px-3 py-2">Barkod</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Satış</th>
                  <th className="px-3 py-2">İndirimli</th>
                  <th className="px-3 py-2">Stok</th>
                  <th className="px-3 py-2">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f2]">
                {preview.sampleRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.title || "—"}</td>
                    <td className="px-3 py-2">{row.variantLabel || "—"}</td>
                    <td className="px-3 py-2">{row.barcode || "—"}</td>
                    <td className="px-3 py-2">{row.sku || "—"}</td>
                    <td className="px-3 py-2">{row.price || "—"}</td>
                    <td className="px-3 py-2">{row.discount || "—"}</td>
                    <td className="px-3 py-2">{row.stock || "—"}</td>
                    <td className="px-3 py-2">{row.category || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">3. Kategori, marka ve filtre eşlemesi</h3>
        <p className="mt-1 text-sm text-slate-500">
          XML’deki her kategori ve marka değeri için mağazadaki kaydı seçin. Eşlenmeyen kategori
          veya markadaki ürünler çekilmez; sitede satmadığınız ürünler kataloga girmez. Varsayılan
          kategori / marka yalnızca kaynakta bu alan boşsa kullanılır. Filtreler ürün kartındaki
          özel filtrelerdir; beden ve renk varyant özelliği olarak kalır.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Varsayılan kategori</span>
            <select
              className={inputClass}
              value={editor.defaultCategoryId}
              onChange={(event) => onChange("defaultCategoryId", event.target.value)}
            >
              <option value="">Seçilmedi</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {"- ".repeat(item.depth ?? 0)}
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Varsayılan marka</span>
            <select
              className={inputClass}
              value={editor.defaultBrandId}
              onChange={(event) => onChange("defaultBrandId", event.target.value)}
            >
              <option value="">Seçilmedi</option>
              {brands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ValueMapTable
            title="Kategoriler"
            emptyHint="Kategori etiketini eşleyip XML’i tekrar çekin."
            emptyOption="Çekme"
            values={preview?.xmlCategories ?? editor.categoryAliases.map((alias) => alias.from)}
            aliases={editor.categoryAliases}
            options={categories}
            onChange={(aliases) => onChange("categoryAliases", aliases)}
          />
          <ValueMapTable
            title="Markalar"
            emptyHint="Marka etiketini eşleyip XML’i tekrar çekin."
            emptyOption="Çekme"
            values={preview?.xmlBrands ?? editor.brandAliases.map((alias) => alias.from)}
            aliases={editor.brandAliases}
            options={brands}
            onChange={(aliases) => onChange("brandAliases", aliases)}
          />
        </div>
        {mappedFilterIds.length > 0 ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {mappedFilterIds.map((filterId) => {
              const filter = filters.find((item) => item.id === filterId);
              if (!filter || filter.inputType === "RANGE") return null;
              const options =
                filter.inputType === "BOOLEAN"
                  ? [{ id: "yes", name: "Evet" }, { id: "no", name: "Hayır" }]
                  : filter.values;
              return (
                <ValueMapTable
                  key={filter.id}
                  title={`Filtre: ${filter.name}`}
                  emptyHint="Bu filtreyi eşleyip XML’i tekrar çekin."
                  values={
                    preview?.xmlFilterValues?.[filter.id] ??
                    (editor.filterValueAliases[filter.id] ?? []).map((alias) => alias.from)
                  }
                  aliases={editor.filterValueAliases[filter.id] ?? []}
                  options={options}
                  onChange={(aliases) =>
                    onChange("filterValueAliases", {
                      ...editor.filterValueAliases,
                      [filter.id]: aliases,
                    })
                  }
                />
              );
            })}
          </div>
        ) : filters.length > 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-[#e9ebec] px-4 py-3 text-sm text-slate-500">
            Ürün filtrelerini bağlamak için 2. adımda ilgili XML etiketini “Ürün filtreleri”
            grubundan seçin. Materyal, yaka, sezon gibi alanlar otomatik önerilir.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">4. Senkron kuralları</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Ürün eşleme anahtarı</span>
            <select
              className={inputClass}
              value={editor.matchBy}
              onChange={(event) => onChange("matchBy", event.target.value as XmlFeedFormValues["matchBy"])}
            >
              {XML_FEED_MATCH_BY.map((value) => (
                <option key={value} value={value}>
                  {xmlFeedMatchByLabel(value)}
                </option>
              ))}
            </select>
            {editor.matchBy === "PRODUCT_ID" ? (
              <p className="mt-1 text-xs text-slate-400">
                <code>&lt;product_Id&gt;</code> etiketini 2. adımda “Ürün ID” alanına eşleyin. Bu
                değer mağazanın iç cuid kimliği değil; tedarikçi ürün kimliği olarak saklanır ve
                sonraki senkronlarda aynı ürüne bağlanır.
              </p>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">SKU öneki</span>
            <input
              className={inputClass}
              value={editor.skuPrefix}
              onChange={(event) => onChange("skuPrefix", event.target.value)}
              placeholder="A-"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Fiyat artışı (%)</span>
            <input
              className={inputClass}
              value={editor.priceMarkupPercent}
              onChange={(event) => onChange("priceMarkupPercent", event.target.value)}
              placeholder="0"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Fiyat yuvarlama</span>
            <select
              className={inputClass}
              value={editor.priceRound}
              onChange={(event) => onChange("priceRound", event.target.value as XmlFeedFormValues["priceRound"])}
            >
              {XML_FEED_PRICE_ROUNDS.map((value) => (
                <option key={value} value={value}>
                  {xmlFeedPriceRoundLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Çalışma aralığı</span>
            <select
              className={inputClass}
              value={editor.intervalMinutes}
              onChange={(event) => onChange("intervalMinutes", Number(event.target.value))}
            >
              {XML_FEED_INTERVALS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <AdminSwitch
            label="XML fiyatı KDV dahil"
            description="Mağazada KDV hariç saklanır; işaretliyse önce vergi düşülür."
            checked={editor.priceIncludesTax}
            onChange={(checked) => onChange("priceIncludesTax", checked)}
          />
          <AdminSwitch
            label="Eşleşmeyen satırları yeni ürün olarak ekle"
            checked={editor.createNew}
            onChange={(checked) => onChange("createNew", checked)}
          />
          <AdminSwitch
            label="XML’de olmayanları siparişe kapat"
            description="Yalnızca bu kaynağın tedarikçisine bağlı ürünler. Silinmez."
            checked={editor.deactivateMissing}
            onChange={(checked) => onChange("deactivateMissing", checked)}
          />
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-600">Stok limiti</span>
            <input
              type="number"
              min={0}
              step={1}
              className={inputClass}
              value={editor.stockLimit}
              onChange={(event) => onChange("stockLimit", Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
            />
            <span className="mt-1.5 block text-xs text-slate-500">
              Bu değerin altındaki stok satışa kapanır. 0 = limit yok. Stoksuz ürünler için 1 yazın.
            </span>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Stokta kalmadığında</p>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              {XML_FEED_OUT_OF_STOCK.map((behavior) => (
                <label key={behavior} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="xml-out-of-stock"
                    value={behavior}
                    checked={editor.outOfStockBehavior === behavior}
                    onChange={() => onChange("outOfStockBehavior", behavior)}
                  />
                  {xmlFeedOutOfStockLabel(behavior)}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Limitin altındaki ürüne uygulanır. Ön sipariş seçiliyse ürün siparişe açık kalır.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700">Satış ve katalog</h4>
          <p className="mt-1 text-sm text-slate-500">
            Bu kaynaktaki tedarikçiye bağlı ürünler için geçerlidir. Senkron çalışınca uygulanır.
          </p>
          <div className="mt-3 grid gap-3">
            <AdminSwitch
              label="Bütün ürünleri satışa kapat"
              description="Tedarikçiye bağlı tüm ürünler siparişe kapanır. Yeni ürün eklenmez."
              checked={editor.closeAllForSale}
              onChange={(checked) => onChange("closeAllForSale", checked)}
            />
            <AdminSwitch
              label="Stoğu sıfır olan ürünleri satışa kapat"
              description="Stok 0 veya boşsa kapanır. Stokta olanlar bir sonraki kontrolde stoğu bitince kapanır. Ön sipariş seçiliyse açık kalır."
              checked={editor.closeZeroStock}
              onChange={(checked) => onChange("closeZeroStock", checked)}
            />
            <AdminSwitch
              label="Hiç satılmayan ürünleri sil"
              description="Siparişi hiç oluşmamış ürünler, görselleri ve yüklenen dosyalarıyla birlikte silinir. Siparişi olan ürünlere dokunulmaz. XML boş veya hatalıysa silinmez."
              checked={editor.deleteUnsold}
              onChange={(checked) => onChange("deleteUnsold", checked)}
            />
          </div>
          {!editor.supplierId && (editor.closeAllForSale || editor.deleteUnsold) ? (
            <p className="mt-2 text-xs text-amber-700">
              Bu iki işlem için yukarıdan tedarikçi seçmeniz gerekir.
            </p>
          ) : null}
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700">Mevcut üründe güncellenecek alanlar</h4>
          <p className="mt-1 text-sm text-slate-500">
            Açık olan alanlar eşleşen üründe XML’den yazılır. Kapalı olanlar ilk eklemede gelir, sonra
            dokunulmaz. Satış yalnızca fiyat 0/boş (fiyat güncellemesi açıksa), XML’de görsel yok
            (görsel güncellemesi açıksa) veya stok politikası gereği kapanır. KDV, kategori, kargo gibi
            boş alanlar mevcut değeri korur; ürünü kapatmaz.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {XML_FEED_TARGET_FIELDS.map((field) => (
              <AdminSwitch
                key={field.key}
                label={xmlFeedTargetLabel(field.key)}
                description={field.hint || undefined}
                checked={editor.updateFields.includes(field.key)}
                onChange={(checked) =>
                  onChange("updateFields", toggleUpdateField(editor.updateFields, field.key, checked))
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Son çalışma</h3>
            {editingFeed?.lastMessage ? (
              <p className="mt-1 text-sm text-slate-500">{editingFeed.lastMessage}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Henüz senkron kaydı yok.</p>
            )}
            {editingFeed?.lastRunAt ? (
              <p className="mt-1 text-xs text-slate-400">{formatWhen(editingFeed.lastRunAt)}</p>
            ) : null}
          </div>
          {editor.id ? (
            <button
              type="button"
              onClick={() => setLogsOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ScrollText className="h-4 w-4" />
              Kayıtları göster
            </button>
          ) : null}
        </div>
      </section>
      {logsOpen && editor.id ? (
        <XmlFeedRunsModal feedId={editor.id} onClose={() => setLogsOpen(false)} />
      ) : null}
    </div>
  );
}

function XmlFeedRunsModal({ feedId, onClose }: { feedId: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [runs, setRuns] = useState<XmlProductFeedRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pageCount = Math.max(1, Math.ceil(total / XML_FEED_RUN_PAGE_SIZE));

  function load(nextPage: number) {
    start(() => {
      void listXmlFeedRunsAction(feedId, nextPage).then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setError(null);
        setRuns(result.runs ?? []);
        setTotal(result.total ?? 0);
        setPage(result.page ?? nextPage);
      });
    });
  }

  useEffect(() => {
    load(1);
  }, [feedId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="xml-feed-runs-title"
        className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <h2 id="xml-feed-runs-title" className="text-base font-semibold text-slate-800">
              Yükleme kayıtları
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {total > 0 ? `${total} kayıt · sayfa ${page} / ${pageCount}` : "Kayıtlar istendiğinde yüklenir."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {pending && runs.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Kayıtlar yükleniyor…
            </p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz senkron kaydı yok.</p>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Satır</th>
                  <th className="px-3 py-2">Yeni</th>
                  <th className="px-3 py-2">Güncellenen</th>
                  <th className="px-3 py-2">Atlanan</th>
                  <th className="px-3 py-2">Hata</th>
                  <th className="px-3 py-2">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f2]">
                {runs.map((run) => {
                  const failed = run.failedCount > 0 || run.status === "FAILED";
                  return (
                    <Fragment key={run.id}>
                      <tr>
                        <td className="px-3 py-2">{xmlFeedRunStatusLabel(run.status)}</td>
                        <td className="px-3 py-2">{run.itemCount}</td>
                        <td className="px-3 py-2">{run.createdCount}</td>
                        <td className="px-3 py-2">{run.updatedCount}</td>
                        <td className="px-3 py-2">{run.skippedCount}</td>
                        <td className="px-3 py-2">{run.failedCount}</td>
                        <td className="px-3 py-2">{formatWhen(run.startedAt ?? run.createdAt)}</td>
                      </tr>
                      {run.message ? (
                        <tr>
                          <td colSpan={7} className={failed ? "bg-rose-50/70 px-3 py-2" : "bg-slate-50 px-3 py-2"}>
                            <pre
                              className={
                                failed
                                  ? "whitespace-pre-wrap font-sans text-[11px] leading-5 text-rose-800"
                                  : "whitespace-pre-wrap font-sans text-[11px] leading-5 text-slate-600"
                              }
                            >
                              {run.message}
                            </pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#e9ebec] px-5 py-3">
            <button
              type="button"
              disabled={pending || page <= 1}
              onClick={() => load(page - 1)}
              className="rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
            >
              Önceki
            </button>
            <p className="text-xs text-slate-400">
              {page} / {pageCount}
            </p>
            <button
              type="button"
              disabled={pending || page >= pageCount}
              onClick={() => load(page + 1)}
              className="rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ValueMapTable({
  title,
  emptyHint,
  emptyOption = "Eşleme",
  values,
  aliases,
  options,
  onChange,
}: {
  title: string;
  emptyHint: string;
  emptyOption?: string;
  values: string[];
  aliases: XmlFeedCategoryAlias[];
  options: XmlFeedLookupOption[];
  onChange: (aliases: XmlFeedCategoryAlias[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Map(aliases.map((alias) => [alias.from, alias.to]));
  const rows = values.map((value) => value.trim()).filter(Boolean);
  const folded = query.trim().toLocaleLowerCase("tr-TR");
  const visible = folded
    ? rows.filter((value) => value.toLocaleLowerCase("tr-TR").includes(folded))
    : rows;
  const mappedCount = rows.filter((value) => selected.get(value)?.trim()).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <p className="text-xs text-slate-400">
          {mappedCount} / {rows.length} eşlendi
        </p>
      </div>
      {rows.length > 8 ? (
        <input
          className={`${inputClass} mb-2`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Listede ara"
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#e9ebec] px-3 py-6 text-center text-sm text-slate-500">
          {emptyHint}
        </p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-md border border-[#eef0f2]">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">XML değeri</th>
                <th className="px-3 py-2">Mağaza kaydı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f2]">
              {visible.map((value) => (
                <tr key={value}>
                  <td className="max-w-[14rem] px-3 py-2 align-top text-xs text-slate-700">{value}</td>
                  <td className="px-3 py-2">
                    <select
                      className={inputClass}
                      value={selected.get(value) ?? ""}
                      onChange={(event) => onChange(upsertValueAlias(aliases, value, event.target.value))}
                    >
                      <option value="">{emptyOption}</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.name}>
                          {"- ".repeat(item.depth ?? 0)}
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
