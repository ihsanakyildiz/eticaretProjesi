"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Inbox,
  Loader2,
  LogOut,
  Quote,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useCan } from "@/components/admin/admin-permissions";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SupportChatChannelLogo } from "@/modules/support-chat/components/channel-logo";
import { SupportChatCustomerProfileModal } from "@/modules/support-chat/components/customer-profile-modal";
import {
  ConversationContextMenu,
  type ConversationContextAction,
} from "@/modules/support-chat/components/conversation-context-menu";
import { WhatsAppTemplateModal } from "@/modules/support-chat/components/whatsapp-template-modal";
import { normalizeWhatsAppTo } from "@/modules/support-chat/whatsapp-template";
import { SupportChatImageLightbox } from "@/modules/support-chat/components/support-chat-image-lightbox";
import { SupportChatComposer } from "@/modules/support-chat/components/support-chat-composer";
import scrollStyles from "./support-chat-scroll.module.css";
import {
  loadSupportChatInboxAction,
  pollSupportChatInboxAction,
  listSupportChatMessagesAction,
  markSupportChatConversationReadAction,
  markSupportChatConversationUnreadAction,
  assignSupportChatConversationAction,
  setSupportChatConversationDepartmentAction,
  bulkArchiveOwnSupportChatAction,
  bulkMarkOwnSupportChatReadAction,
  bulkUnassignOwnSupportChatAction,
  sendSupportChatMessageAction,
  setSupportChatConversationFolderAction,
  unassignSupportChatConversationAction,
  permanentlyDeleteSupportChatConversationAction,
  emptySupportChatTrashAction,
} from "@/modules/support-chat/actions";
import {
  SUPPORT_CHAT_CHANNELS,
  isSupportChatInboxTab,
  supportChatChannelLabel,
  supportChatConversationIdFromLocation,
  supportChatFolderLabel,
  supportChatFolderStatusLabel,
  supportChatInboxHref,
  supportChatPersonKey,
  supportChatKindFromFile,
  supportChatMediaKindLabel,
  supportChatMessagePreview,
  type SupportChatChannel,
  type SupportChatConversationRow,
  type SupportChatDepartmentRow,
  type SupportChatFolder,
  type SupportChatInboxTab,
  type SupportChatMediaItem,
  type SupportChatMessageRow,
  type SupportChatQuote,
  type SupportChatReplyRow,
  type SupportChatTagRow,
} from "@/modules/support-chat/kinds";

type OpenMenu = "folder" | "channels" | "agents" | null;
type ChannelFilter = "all" | SupportChatChannel;
type ConversationSort = "newest" | "oldest";
type StaffPerson = { id: string; name: string | null; email: string; image?: string | null };
type PersonGroup = {
  key: string;
  head: SupportChatConversationRow;
  matching: SupportChatConversationRow[];
  related: SupportChatConversationRow[];
};
type AgentGroup = {
  userId: string;
  person: StaffPerson;
  head: SupportChatConversationRow;
  matching: SupportChatConversationRow[];
  related: SupportChatConversationRow[];
};
type ListItem =
  | { kind: "customer"; sortAt: number; group: PersonGroup }
  | { kind: "agent"; sortAt: number; group: AgentGroup };

function sortConversationsByTime(list: SupportChatConversationRow[], order: ConversationSort) {
  return [...list].sort((left, right) => {
    const leftAt = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
    const rightAt = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
    switch (order) {
      case "newest":
        return rightAt - leftAt;
      case "oldest":
        return leftAt - rightAt;
      default: {
        const _exhaustive: never = order;
        return _exhaustive;
      }
    }
  });
}

function folderStatusClass(folder: SupportChatFolder) {
  switch (folder) {
    case "INBOX":
      return "bg-slate-100 text-slate-600";
    case "ARCHIVE":
      return "bg-amber-50 text-amber-700";
    case "TRASH":
      return "bg-rose-50 text-rose-700";
    default: {
      const _exhaustive: never = folder;
      return _exhaustive;
    }
  }
}

const TAB_STORAGE_KEY = "support-chat-inbox-tab";
const SORT_STORAGE_KEY = "support-chat-inbox-sort";
const LIST_SCROLL_KEY = "support-chat-inbox-list-scroll";

const AVATAR_COLORS = ["#405189", "#0ab39c", "#f06548", "#3577f1", "#6559cc", "#f7b84b"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

function CustomerAvatar({
  id,
  name,
  src,
  size = "sm",
}: {
  id: string;
  name: string;
  src: string | null;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const box = size === "md" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`grid ${box} shrink-0 place-items-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: colorFor(id) }}
    >
      {initials(name)}
    </span>
  );
}

function hasConversationPostPreview(
  row: Pick<SupportChatConversationRow, "sourceUrl" | "sourceTitle" | "sourceImage">,
) {
  return Boolean(row.sourceUrl?.trim() || row.sourceTitle?.trim() || row.sourceImage?.trim());
}

function PostPreviewImage({
  src,
  className,
  fallback,
}: {
  src: string | null | undefined;
  className: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) return fallback;
  return <img src={src} alt="" onError={() => setFailed(true)} className={className} />;
}

function ConversationPostPreview({
  row,
  variant,
}: {
  row: Pick<SupportChatConversationRow, "channelLabel" | "sourceUrl" | "sourceTitle" | "sourceImage">;
  variant: "thread" | "sidebar";
}) {
  if (!hasConversationPostPreview(row)) return null;
  const href = row.sourceUrl?.trim() || "";
  const title = row.sourceTitle?.trim() || "Gönderiyi aç";
  let inner: ReactNode;
  let className: string;
  switch (variant) {
    case "thread":
      className =
        "mx-5 mt-3 flex items-stretch gap-3 rounded-lg border border-[#e9ebec] bg-white p-2.5 shadow-sm hover:border-[#405189]/40";
      inner = (
        <>
          <PostPreviewImage
            src={row.sourceImage}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
            fallback={
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-[#405189]/10 text-[#405189]">
                <ExternalLink className="h-5 w-5" />
              </span>
            }
          />
          <span className="min-w-0 flex-1 py-0.5">
            <span className="block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {row.channelLabel}
            </span>
            <span className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-800">{title}</span>
            {href ? (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#405189]">
                <ExternalLink className="h-3 w-3" />
                Gönderiyi aç
              </span>
            ) : null}
          </span>
        </>
      );
      break;
    case "sidebar":
      className =
        "mt-2 flex items-center gap-2 rounded-md border border-[#e9ebec] p-2 hover:border-[#405189]/40";
      inner = (
        <>
          <PostPreviewImage
            src={row.sourceImage}
            className="h-10 w-10 shrink-0 rounded object-cover"
            fallback={
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#405189]/10 text-[#405189]">
                <ExternalLink className="h-4 w-4" />
              </span>
            }
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-slate-800">{title}</span>
            {href ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#405189]">
                <ExternalLink className="h-3 w-3" />
                Gönderiyi aç
              </span>
            ) : null}
          </span>
        </>
      );
      break;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}

function ConversationIdentity({
  row,
  size = "sm",
}: {
  row: Pick<SupportChatConversationRow, "id" | "channel" | "customerName" | "customerAvatar">;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-10 w-10" : "h-9 w-9";
  const logo = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className={`relative ${box} shrink-0`}>
      <CustomerAvatar id={row.id} name={row.customerName} src={row.customerAvatar} size={size} />
      <span className="pointer-events-none absolute -right-0.5 -bottom-0.5">
        <SupportChatChannelLogo channel={row.channel} className={logo} badge />
      </span>
    </span>
  );
}

function AgentIdentity({
  person,
  size = "sm",
}: {
  person: StaffPerson;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-10 w-10" : "h-9 w-9";
  const badge = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const icon = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const label = staffLabel(person);
  return (
    <span className={`relative ${box} shrink-0`}>
      <CustomerAvatar id={person.id} name={label} src={person.image ?? null} size={size} />
      <span
        className={`pointer-events-none absolute -right-0.5 -bottom-0.5 grid ${badge} place-items-center rounded-full bg-[#405189] text-white ring-[1.5px] ring-white`}
      >
        <UserRound className={icon} />
      </span>
    </span>
  );
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function staffLabel(person: { name: string | null; email: string }) {
  return person.name?.trim() || person.email;
}

function sortButtonMeta(order: ConversationSort) {
  switch (order) {
    case "newest":
      return { title: "Yeniden eskiye", Icon: ArrowDown };
    case "oldest":
      return { title: "Eskiden yeniye", Icon: ArrowUp };
    default: {
      const _exhaustive: never = order;
      return _exhaustive;
    }
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

function maxBytesForKind(kind: SupportChatMediaItem["kind"]) {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "video":
    case "audio":
    case "document":
      return MAX_MEDIA_BYTES;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function visibleMessageBody(message: SupportChatMessageRow) {
  const media = message.media ?? [];
  const label = media[0] ? supportChatMediaKindLabel(media[0].kind) : "";
  if (!message.body || message.body === label || message.body === "(medya)") return "";
  return message.body;
}

const THREAD_PIN_PX = 96;

function isThreadNearBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= THREAD_PIN_PX;
}

function SupportChatBubbleMedia({
  items,
  outgoing,
  onOpenImage,
}: {
  items: SupportChatMediaItem[];
  outgoing: boolean;
  onOpenImage: (item: SupportChatMediaItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        switch (item.kind) {
          case "image":
            return (
              <button
                key={item.src}
                type="button"
                onClick={() => onOpenImage(item)}
                className="block max-w-full overflow-hidden rounded-lg"
                title="Görseli büyüt"
              >
                <img
                  src={item.src}
                  alt={item.fileName || "Görsel"}
                  className="max-h-64 max-w-full cursor-zoom-in object-contain"
                />
              </button>
            );
          case "video":
            return (
              <video key={item.src} src={item.src} controls className="max-h-64 w-full rounded-lg bg-black" />
            );
          case "audio":
            return <audio key={item.src} src={item.src} controls className="w-full min-w-[220px]" />;
          case "document":
            return (
              <a
                key={item.src}
                href={item.src}
                target="_blank"
                rel="noreferrer"
                className={outgoing ? "underline" : "text-[#405189] underline"}
              >
                {item.fileName || "Dosya"}
              </a>
            );
          default: {
            const _exhaustive: never = item.kind;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}

export function SupportChatInboxShell({
  conversations,
  replies,
  tags,
  staff,
  departments,
  staffDepartmentIds,
  live,
  currentUserId,
  currentUserName,
  ownAssignedInboxCount,
  ownUnreadInboxCount,
}: {
  conversations: SupportChatConversationRow[];
  replies: SupportChatReplyRow[];
  tags: SupportChatTagRow[];
  staff: Array<{ id: string; name: string | null; email: string; image?: string | null }>;
  departments: SupportChatDepartmentRow[];
  staffDepartmentIds: Record<string, string[]>;
  live: boolean;
  currentUserId: string;
  currentUserName: string;
  ownAssignedInboxCount: number;
  ownUnreadInboxCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSelectedId = supportChatConversationIdFromLocation(pathname, searchParams);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selectedId = pickedId ?? urlSelectedId;
  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<SupportChatInboxTab>(() =>
    isSupportChatInboxTab(urlTab) ? urlTab : "hepsi",
  );
  const [folder, setFolder] = useState<SupportChatFolder>("INBOX");
  const [sortOrder, setSortOrder] = useState<ConversationSort>("newest");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [viewingAgentId, setViewingAgentId] = useState(currentUserId);
  const [listFocus, setListFocus] = useState<"customer" | "agent">("customer");
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(conversations);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessageRow[]>([]);
  const [threadForId, setThreadForId] = useState<string | null>(null);
  const threadLoadSeq = useRef(0);
  const [quoting, setQuoting] = useState<SupportChatQuote | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingVoice, setPendingVoice] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [profileConversationId, setProfileConversationId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [listMenu, setListMenu] = useState<{
    x: number;
    y: number;
    row: SupportChatConversationRow;
  } | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const canPurgeTrash = useCan("support", "delete");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const [assignBusyId, setAssignBusyId] = useState<string | null>(null);
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [assignedInboxCount, setAssignedInboxCount] = useState(ownAssignedInboxCount);
  const [unreadInboxCount, setUnreadInboxCount] = useState(ownUnreadInboxCount);
  const menuRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const threadInnerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pinThreadToLatest = useRef(true);
  const ignoreThreadScroll = useRef(false);

  function persistListScroll() {
    const list = listRef.current;
    if (!list) return;
    try {
      sessionStorage.setItem(LIST_SCROLL_KEY, String(list.scrollTop));
    } catch {
      /* ignore */
    }
  }

  function scrollThreadToLatest() {
    const thread = threadRef.current;
    if (!thread || !pinThreadToLatest.current) return;
    ignoreThreadScroll.current = true;
    thread.scrollTop = thread.scrollHeight;
    window.requestAnimationFrame(() => {
      ignoreThreadScroll.current = false;
    });
  }

  useEffect(() => {
    setRows(conversations);
  }, [conversations]);

  useEffect(() => {
    setAssignedInboxCount(ownAssignedInboxCount);
    setUnreadInboxCount(ownUnreadInboxCount);
  }, [ownAssignedInboxCount, ownUnreadInboxCount]);

  useEffect(() => {
    if (!openMenu) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [openMenu]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    if (!pendingFile.type.startsWith("image/") && !pendingFile.type.startsWith("audio/")) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const folderSyncId = useRef<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (isSupportChatInboxTab(fromUrl)) {
      setTab(fromUrl);
      try {
        localStorage.setItem(TAB_STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(TAB_STORAGE_KEY);
    } catch {
      saved = null;
    }
    const nextTab = isSupportChatInboxTab(saved) ? saved : "hepsi";
    setTab(nextTab);
    router.replace(supportChatInboxHref({ conversationId: selectedId, tab: nextTab }), { scroll: false });
  }, [searchParams, selectedId, router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved === "newest" || saved === "oldest") setSortOrder(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    try {
      const saved = Number(sessionStorage.getItem(LIST_SCROLL_KEY) ?? "");
      if (Number.isFinite(saved) && saved > 0) list.scrollTop = saved;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setPickedId(null);
  }, [urlSelectedId]);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let inflight = false;
    async function refresh() {
      if (inflight) return;
      inflight = true;
      try {
        const result = await pollSupportChatInboxAction();
        if (cancelled || "error" in result) return;
        setRows(result.conversations);
      } finally {
        inflight = false;
      }
    }
    const timer = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [live]);

  const folderRows = useMemo(() => rows.filter((row) => row.folder === folder), [rows, folder]);
  const hepsiRows = useMemo(
    () => folderRows.filter((row) => !row.assignedUserId && row.handledBy !== "BOT"),
    [folderRows],
  );
  const botRows = useMemo(
    () => folderRows.filter((row) => row.handledBy === "BOT"),
    [folderRows],
  );
  const mineRows = useMemo(
    () => folderRows.filter((row) => row.assignedUserId === viewingAgentId),
    [folderRows, viewingAgentId],
  );

  const relatedByPerson = useMemo(() => {
    const map = new Map<string, SupportChatConversationRow[]>();
    for (const row of rows) {
      const key = supportChatPersonKey(row);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    for (const [key, list] of map) {
      map.set(key, sortConversationsByTime(list, "newest"));
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const base = tab === "hepsi" ? hepsiRows : tab === "bot" ? botRows : mineRows;
    const list = base.filter((row) => {
      if (channelFilter !== "all" && row.channel !== channelFilter) return false;
      if (!query.trim()) return true;
      const hay = `${row.customerName} ${row.customerHandle ?? ""} ${row.lastMessagePreview}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
    const sorted = sortConversationsByTime(list, sortOrder);
    const seen = new Set<string>();
    const groups: PersonGroup[] = [];
    for (const row of sorted) {
      const key = supportChatPersonKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      const related = relatedByPerson.get(key) ?? [row];
      const matching = related.filter((item) => list.some((match) => match.id === item.id));
      groups.push({
        key,
        head: matching[0] ?? row,
        matching,
        related,
      });
    }
    return groups;
  }, [tab, hepsiRows, botRows, mineRows, channelFilter, query, sortOrder, relatedByPerson]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function resolveStaffPerson(userId: string, fallbackName: string | null): StaffPerson {
    if (userId === currentUserId) {
      const found = staff.find((item) => item.id === userId);
      return {
        id: userId,
        name: currentUserName,
        email: found?.email ?? "",
        image: found?.image ?? null,
      };
    }
    return (
      staff.find((item) => item.id === userId) ?? {
        id: userId,
        name: fallbackName,
        email: "",
        image: null,
      }
    );
  }

  const agentRelatedById = useMemo(() => {
    const map = new Map<string, SupportChatConversationRow[]>();
    for (const row of rows) {
      if (!row.assignedUserId) continue;
      const list = map.get(row.assignedUserId) ?? [];
      list.push(row);
      map.set(row.assignedUserId, list);
    }
    for (const [userId, list] of map) {
      map.set(userId, sortConversationsByTime(list, "newest"));
    }
    return map;
  }, [rows]);

  const agentGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = folderRows.filter((row) => {
      if (!row.assignedUserId) return false;
      if (channelFilter !== "all" && row.channel !== channelFilter) return false;
      return true;
    });
    const seen = new Set<string>();
    const groups: AgentGroup[] = [];
    for (const row of sortConversationsByTime(matching, sortOrder)) {
      const userId = row.assignedUserId;
      if (!userId || seen.has(userId)) continue;
      seen.add(userId);
      const person = resolveStaffPerson(userId, row.assignedName);
      if (needle && !staffLabel(person).toLowerCase().includes(needle)) continue;
      const related = agentRelatedById.get(userId) ?? [row];
      groups.push({
        userId,
        person,
        head: row,
        matching: matching.filter((item) => item.assignedUserId === userId),
        related,
      });
    }
    return groups;
  }, [folderRows, channelFilter, query, sortOrder, agentRelatedById, staff, currentUserId, currentUserName]);

  const listItems = useMemo(() => {
    const items: ListItem[] = [
      ...filtered.map((group) => ({
        kind: "customer" as const,
        sortAt: group.head.lastMessageAt ? new Date(group.head.lastMessageAt).getTime() : 0,
        group,
      })),
      ...agentGroups.map((group) => ({
        kind: "agent" as const,
        sortAt: group.head.lastMessageAt ? new Date(group.head.lastMessageAt).getTime() : 0,
        group,
      })),
    ];
    return items.sort((left, right) => {
      switch (sortOrder) {
        case "newest":
          return right.sortAt - left.sortAt;
        case "oldest":
          return left.sortAt - right.sortAt;
        default: {
          const _exhaustive: never = sortOrder;
          return _exhaustive;
        }
      }
    });
  }, [filtered, agentGroups, sortOrder]);

  const focusedAgent = focusedAgentId
    ? resolveStaffPerson(
        focusedAgentId,
        rows.find((row) => row.assignedUserId === focusedAgentId)?.assignedName ?? null,
      )
    : null;
  const relatedThreads =
    listFocus === "agent" && focusedAgentId
      ? (agentRelatedById.get(focusedAgentId) ?? [])
      : selected
        ? (relatedByPerson.get(supportChatPersonKey(selected)) ?? [selected])
        : [];
  useEffect(() => {
    if (!selectedId || folderSyncId.current === selectedId) return;
    const row = rows.find((item) => item.id === selectedId);
    if (!row) return;
    setFolder(row.folder);
    folderSyncId.current = selectedId;
  }, [selectedId, rows]);

  const threadLoading = Boolean(selectedId && threadForId !== selectedId);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setThreadForId(null);
      return;
    }
    setQuoting(null);
    const conversationId = selectedId;
    const seq = ++threadLoadSeq.current;
    let cancelled = false;

    async function loadThread() {
      try {
        const next = await listSupportChatMessagesAction(conversationId);
        if (cancelled || threadLoadSeq.current !== seq) return;
        setMessages(next);
        setThreadForId(conversationId);
      } catch {
        if (cancelled || threadLoadSeq.current !== seq) return;
        try {
          const retry = await listSupportChatMessagesAction(conversationId);
          if (cancelled || threadLoadSeq.current !== seq) return;
          setMessages(retry);
          setThreadForId(conversationId);
        } catch {
          if (cancelled || threadLoadSeq.current !== seq) return;
          setMessages([]);
          setThreadForId(conversationId);
        }
      }
    }

    void loadThread();
    const retryTimer = window.setTimeout(() => {
      if (cancelled || threadLoadSeq.current !== seq) return;
      void listSupportChatMessagesAction(conversationId).then((next) => {
        if (cancelled || threadLoadSeq.current !== seq) return;
        setMessages(next);
        setThreadForId(conversationId);
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!live || !selectedId) return;
    const conversationId = selectedId;
    let cancelled = false;
    let inflight = false;
    const timer = window.setInterval(() => {
      if (inflight) return;
      inflight = true;
      void listSupportChatMessagesAction(conversationId)
        .then((next) => {
          if (cancelled) return;
          setMessages(next);
          setThreadForId(conversationId);
        })
        .finally(() => {
          inflight = false;
        });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [live, selectedId]);

  useEffect(() => {
    pinThreadToLatest.current = true;
  }, [selectedId]);

  useLayoutEffect(() => {
    scrollThreadToLatest();
    const frame = window.requestAnimationFrame(() => {
      scrollThreadToLatest();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, selectedId]);

  useEffect(() => {
    const inner = threadInnerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(() => {
      scrollThreadToLatest();
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [selectedId, messages.length]);

  function toggleSortOrder() {
    setSortOrder((current) => {
      let next: ConversationSort;
      switch (current) {
        case "newest":
          next = "oldest";
          break;
        case "oldest":
          next = "newest";
          break;
        default: {
          const _exhaustive: never = current;
          return _exhaustive;
        }
      }
      try {
        localStorage.setItem(SORT_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function goTo(next: { conversationId?: string | null; tab?: SupportChatInboxTab }) {
    const nextTab = next.tab ?? tab;
    const nextId = next.conversationId === undefined ? selectedId : next.conversationId;
    try {
      localStorage.setItem(TAB_STORAGE_KEY, nextTab);
    } catch {
      /* ignore */
    }
    setTab(nextTab);
    persistListScroll();
    if (next.conversationId !== undefined) setPickedId(next.conversationId);
    router.replace(supportChatInboxHref({ conversationId: nextId, tab: nextTab }), { scroll: false });
  }

  function selectConversation(id: string, focus: "customer" | "agent" = "customer") {
    persistListScroll();
    setListFocus(focus);
    if (focus === "customer") setFocusedAgentId(null);
    setPickedId(id);
    openConversation(id);
    window.setTimeout(() => {
      router.replace(supportChatInboxHref({ conversationId: id, tab }), { scroll: false });
    }, 0);
  }

  function selectAgent(group: AgentGroup) {
    setFocusedAgentId(group.userId);
    selectConversation(group.head.id, "agent");
  }

  function openConversation(id: string) {
    setSendError(null);
    setQuoting(null);
    setPendingFile(null);
    setPendingVoice(false);
    const opened = rows.find((row) => row.id === id);
    if (
      opened &&
      opened.assignedUserId === currentUserId &&
      opened.folder === "INBOX" &&
      opened.unreadCount > 0
    ) {
      setUnreadInboxCount((count) => Math.max(0, count - 1));
    }
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, unreadCount: 0 } : row)),
    );
    void markSupportChatConversationReadAction(id);
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    const kind = supportChatKindFromFile(file.type, file.name);
    if (kind === "document") {
      setSendError("Yalnızca görsel, video veya ses ekleyebilirsiniz.");
      return;
    }
    const max = maxBytesForKind(kind);
    if (file.size > max) {
      setSendError(`${supportChatMediaKindLabel(kind)} en fazla ${Math.round(max / 1024 / 1024)} MB olabilir.`);
      return;
    }
    setSendError(null);
    setPendingVoice(false);
    setPendingFile(file);
  }

  async function sendMessage() {
    if (!selected || sending || (!draft.trim() && !pendingFile)) return;
    const text = draft.trim();
    const quoted = quoting;
    const file = pendingFile;
    const voice = pendingVoice;
    const previewSrc = pendingPreview;
    const tempId = `temp:${Date.now()}`;
    const optimistic: SupportChatMessageRow = {
      id: tempId,
      direction: "OUT",
      body: text,
      sentAt: new Date().toISOString(),
      quote: quoted,
      media: file
        ? [
            {
              kind: supportChatKindFromFile(file.type, file.name),
              mime: file.type || "application/octet-stream",
              fileName: file.name,
              src: previewSrc || "",
            },
          ]
        : [],
    };
    pinThreadToLatest.current = true;
    setMessages((current) => [...current, optimistic]);
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              lastMessagePreview: supportChatMessagePreview(text, optimistic.media),
              lastMessageAt: optimistic.sentAt,
            }
          : row,
      ),
    );
    setDraft("");
    setQuoting(null);
    setPendingFile(null);
    setPendingVoice(false);
    setSending(true);
    setSendError(null);
    const payload = new FormData();
    payload.set("conversationId", selected.id);
    payload.set("body", text);
    if (quoted?.messageId) payload.set("quotedMessageId", quoted.messageId);
    if (file) payload.set("file", file);
    if (voice) payload.set("voiceNote", "1");
    const result = await sendSupportChatMessageAction(payload);
    setSending(false);
    if ("error" in result) {
      setSendError(result.error);
      setMessages((current) => current.filter((item) => item.id !== tempId));
      setDraft(text);
      setQuoting(quoted);
      return;
    }
    if (result.assigned) {
      setRows((current) =>
        current.map((row) =>
          row.id === selected.id ? { ...row, assignedUserId: currentUserId, assignedName: currentUserName } : row,
        ),
      );
      if (selected.folder === "INBOX") {
        setAssignedInboxCount((count) => count + 1);
      }
      setTab("benim");
      setViewingAgentId(currentUserId);
      goTo({ tab: "benim", conversationId: selected.id });
    }
    const next = await listSupportChatMessagesAction(selected.id);
    pinThreadToLatest.current = true;
    setMessages(next);
  }

  async function moveTo(nextFolder: SupportChatFolder) {
    if (!selected) return;
    const previousFolder = selected.folder;
    const result = await setSupportChatConversationFolderAction(selected.id, nextFolder);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    if (selected.assignedUserId === currentUserId) {
      if (previousFolder === "INBOX" && nextFolder !== "INBOX") {
        setAssignedInboxCount((count) => Math.max(0, count - 1));
        if (selected.unreadCount > 0) {
          setUnreadInboxCount((count) => Math.max(0, count - 1));
        }
      } else if (previousFolder !== "INBOX" && nextFolder === "INBOX") {
        setAssignedInboxCount((count) => count + 1);
      }
    }
    setRows((current) =>
      current.map((row) => (row.id === selected.id ? { ...row, folder: nextFolder } : row)),
    );
  }

  function removeConversationsFromList(ids: string[]) {
    const gone = new Set(ids);
    setRows((current) => current.filter((row) => !gone.has(row.id)));
    setMessages([]);
    if (profileConversationId && gone.has(profileConversationId)) {
      setProfileConversationId(null);
    }
    if (selected && gone.has(selected.id)) {
      goTo({ conversationId: null });
    }
  }

  async function deleteForever() {
    if (!selected || selected.folder !== "TRASH" || !canPurgeTrash || trashBusy) return;
    if (
      !window.confirm(
        "Bu konuşma kalıcı olarak silinecek. Mesajlar ve yüklenen görseller de silinir. Bu işlem geri alınamaz.",
      )
    ) {
      return;
    }
    setTrashBusy(true);
    setSendError(null);
    try {
      const result = await permanentlyDeleteSupportChatConversationAction(selected.id);
      if ("error" in result) {
        setSendError(result.error ?? "Konuşma silinemedi.");
        return;
      }
      removeConversationsFromList([selected.id]);
    } finally {
      setTrashBusy(false);
    }
  }

  async function emptyTrash() {
    const trashCount = rows.filter((row) => row.folder === "TRASH").length;
    if (!canPurgeTrash || trashBusy || trashCount < 1) return;
    if (
      !window.confirm(
        `Çöp kutusundaki ${trashCount} konuşma kalıcı olarak silinecek. Tüm mesajlar ve yüklenen görseller de silinir. Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setTrashBusy(true);
    setSendError(null);
    try {
      const result = await emptySupportChatTrashAction();
      if ("error" in result) {
        setSendError(result.error ?? "Çöp kutusu boşaltılamadı.");
        return;
      }
      const trashIds = rows.filter((row) => row.folder === "TRASH").map((row) => row.id);
      removeConversationsFromList(trashIds);
    } finally {
      setTrashBusy(false);
    }
  }

  async function leaveConversation() {
    if (!selected?.assignedUserId) return;
    const result = await unassignSupportChatConversationAction(selected.id);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    if (selected.assignedUserId === currentUserId && selected.folder === "INBOX") {
      setAssignedInboxCount((count) => Math.max(0, count - 1));
      if (selected.unreadCount > 0) {
        setUnreadInboxCount((count) => Math.max(0, count - 1));
      }
    }
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? { ...row, assignedUserId: null, assignedName: null, folder: "INBOX" }
          : row,
      ),
    );
    setFolder("INBOX");
    folderSyncId.current = selected.id;
    goTo({ tab: "hepsi", conversationId: selected.id });
  }

  async function assignConversation(userId: string) {
    if (!selected || !live || assignBusyId || userId === selected.assignedUserId) return;
    const previousAssignedId = selected.assignedUserId;
    const person =
      userId === currentUserId
        ? { id: currentUserId, name: currentUserName, email: "" }
        : staff.find((item) => item.id === userId);
    if (!person) return;
    setAssignBusyId(userId);
    setSendError(null);
    const result = await assignSupportChatConversationAction(selected.id, userId);
    setAssignBusyId(null);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    const assignedName =
      "assignedName" in result && result.assignedName?.trim()
        ? result.assignedName.trim()
        : staffLabel(person);
    const wasOwnInbox = previousAssignedId === currentUserId && selected.folder === "INBOX";
    const willBeOwnInbox = userId === currentUserId;
    if (wasOwnInbox && !willBeOwnInbox) {
      setAssignedInboxCount((count) => Math.max(0, count - 1));
    } else if (!wasOwnInbox && willBeOwnInbox) {
      setAssignedInboxCount((count) => count + 1);
    }
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? { ...row, assignedUserId: userId, assignedName, folder: "INBOX" }
          : row,
      ),
    );
    setFolder("INBOX");
    folderSyncId.current = selected.id;
    setViewingAgentId(userId);
    goTo({ tab: "benim", conversationId: selected.id });
  }

  function openConversationMenu(event: ReactMouseEvent, row: SupportChatConversationRow) {
    event.preventDefault();
    event.stopPropagation();
    setListMenu({ x: event.clientX, y: event.clientY, row });
  }

  async function moveConversationRow(row: SupportChatConversationRow, nextFolder: SupportChatFolder) {
    const previousFolder = row.folder;
    const result = await setSupportChatConversationFolderAction(row.id, nextFolder);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    if (row.assignedUserId === currentUserId) {
      if (previousFolder === "INBOX" && nextFolder !== "INBOX") {
        setAssignedInboxCount((count) => Math.max(0, count - 1));
        if (row.unreadCount > 0) {
          setUnreadInboxCount((count) => Math.max(0, count - 1));
        }
      } else if (previousFolder !== "INBOX" && nextFolder === "INBOX") {
        setAssignedInboxCount((count) => count + 1);
      }
    }
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, folder: nextFolder } : item)),
    );
    if (selectedId === row.id) {
      setFolder(nextFolder);
      folderSyncId.current = row.id;
    }
  }

  async function takeConversationRow(row: SupportChatConversationRow) {
    if (!live || assignBusyId || row.assignedUserId === currentUserId) return;
    const previousAssignedId = row.assignedUserId;
    setAssignBusyId(currentUserId);
    setSendError(null);
    const result = await assignSupportChatConversationAction(row.id, currentUserId);
    setAssignBusyId(null);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    const assignedName =
      "assignedName" in result && result.assignedName?.trim()
        ? result.assignedName.trim()
        : currentUserName;
    const wasOwnInbox = previousAssignedId === currentUserId && row.folder === "INBOX";
    if (!wasOwnInbox) {
      setAssignedInboxCount((count) => count + 1);
    }
    setRows((current) =>
      current.map((item) =>
        item.id === row.id
          ? { ...item, assignedUserId: currentUserId, assignedName, folder: "INBOX" }
          : item,
      ),
    );
    if (selectedId === row.id) {
      setFolder("INBOX");
      folderSyncId.current = row.id;
      setViewingAgentId(currentUserId);
      goTo({ tab: "benim", conversationId: row.id });
    }
  }

  async function markConversationRowRead(row: SupportChatConversationRow) {
    if (row.unreadCount < 1) return;
    const result = await markSupportChatConversationReadAction(row.id);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    if (row.assignedUserId === currentUserId && row.folder === "INBOX") {
      setUnreadInboxCount((count) => Math.max(0, count - 1));
    }
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, unreadCount: 0 } : item)),
    );
  }

  async function markConversationRowUnread(row: SupportChatConversationRow) {
    if (row.unreadCount > 0) return;
    const result = await markSupportChatConversationUnreadAction(row.id);
    if ("error" in result && result.error) {
      setSendError(result.error);
      return;
    }
    if (row.assignedUserId === currentUserId && row.folder === "INBOX") {
      setUnreadInboxCount((count) => count + 1);
    }
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, unreadCount: Math.max(1, item.unreadCount) } : item,
      ),
    );
  }

  async function runConversationMenuAction(
    action: ConversationContextAction,
    row: SupportChatConversationRow,
  ) {
    switch (action) {
      case "take":
        await takeConversationRow(row);
        return;
      case "archive":
        await moveConversationRow(row, "ARCHIVE");
        return;
      case "trash":
        await moveConversationRow(row, "TRASH");
        return;
      case "read":
        await markConversationRowRead(row);
        return;
      case "unread":
        await markConversationRowUnread(row);
        return;
      default: {
        const _never: never = action;
        return _never;
      }
    }
  }

  async function assignDepartment(departmentId: string) {
    if (!selected || !live || departmentBusy) return;
    const nextId = departmentId.trim();
    if ((selected.departmentId ?? "") === nextId) return;
    const department = departments.find((item) => item.id === nextId) ?? null;
    setDepartmentBusy(true);
    setSendError(null);
    const result = await setSupportChatConversationDepartmentAction(selected.id, nextId);
    setDepartmentBusy(false);
    if ("error" in result) {
      setSendError(result.error ?? "Departman güncellenemedi.");
      return;
    }
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              departmentId: result.departmentId,
              departmentName: result.departmentName,
              departmentColor: result.departmentColor ?? department?.color ?? null,
            }
          : row,
      ),
    );
  }

  async function runBulkAction(kind: "leave" | "archive" | "read") {
    if (bulkBusy || !live) return;
    switch (kind) {
      case "leave": {
        if (assignedInboxCount < 1) return;
        if (
          !window.confirm(
            `Üzerinizdeki ${assignedInboxCount} konuşma Hepsi kuyruğuna bırakılacak. Devam edilsin mi?`,
          )
        ) {
          return;
        }
        break;
      }
      case "archive": {
        if (assignedInboxCount < 1) return;
        if (
          !window.confirm(`Üzerinizdeki ${assignedInboxCount} gelen konuşma arşivlenecek. Devam edilsin mi?`)
        ) {
          return;
        }
        break;
      }
      case "read": {
        if (unreadInboxCount < 1) return;
        break;
      }
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }

    setBulkBusy(true);
    setSendError(null);
    try {
      let result: { ok: true; count: number } | { error: string };
      switch (kind) {
        case "leave":
          result = await bulkUnassignOwnSupportChatAction();
          break;
        case "archive":
          result = await bulkArchiveOwnSupportChatAction();
          break;
        case "read":
          result = await bulkMarkOwnSupportChatReadAction();
          break;
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
      if ("error" in result && result.error) {
        setSendError(result.error);
        return;
      }

      const refreshed = await loadSupportChatInboxAction();
      if ("conversations" in refreshed) setRows(refreshed.conversations);

      switch (kind) {
        case "leave": {
          setAssignedInboxCount(0);
          setUnreadInboxCount(0);
          setFolder("INBOX");
          goTo({ tab: "hepsi", conversationId: selectedId });
          return;
        }
        case "archive": {
          setAssignedInboxCount(0);
          setUnreadInboxCount(0);
          if (selected?.assignedUserId === currentUserId && selected.folder === "INBOX") {
            setFolder("ARCHIVE");
            folderSyncId.current = selected.id;
          }
          return;
        }
        case "read": {
          setUnreadInboxCount(0);
          return;
        }
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const folderCount = (value: SupportChatFolder) => rows.filter((row) => row.folder === value).length;
  const agentCount = (userId: string) =>
    folderRows.filter((row) => row.assignedUserId === userId).length;
  const channelCount = (channel: ChannelFilter) => {
    const base = tab === "hepsi" ? hepsiRows : tab === "bot" ? botRows : mineRows;
    if (channel === "all") return base.length;
    return base.filter((row) => row.channel === channel).length;
  };

  const canCompose = Boolean(selected && selected.folder !== "TRASH" && live);
  const sortMeta = sortButtonMeta(sortOrder);
  const assignableAgents = [
    { id: currentUserId, name: currentUserName, email: "" },
    ...staff.filter((person) => person.id !== currentUserId),
  ].filter((person) => {
    const departmentId = selected?.departmentId;
    if (!departmentId) return true;
    if (person.id === selected.assignedUserId) return true;
    return (staffDepartmentIds[person.id] ?? []).includes(departmentId);
  });
  const assignableAgentOptions = assignableAgents.map((person) => {
    const label = staffLabel(person);
    const mine = person.id === currentUserId;
    return {
      id: person.id,
      label: mine ? `Ben · ${label}` : label,
      searchText: `${label} ${person.email} ${mine ? "ben üzerime al" : ""}`,
    };
  });
  const bulkInboxActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={!live || bulkBusy || assignedInboxCount < 1}
        onClick={() => void runBulkAction("leave")}
        className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        Hepsinden çık
      </button>
      <button
        type="button"
        disabled={!live || bulkBusy || assignedInboxCount < 1}
        onClick={() => void runBulkAction("archive")}
        className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <Archive className="h-3.5 w-3.5" />
        Hepsini Arşivle
      </button>
      <button
        type="button"
        disabled={!live || bulkBusy || unreadInboxCount < 1}
        onClick={() => void runBulkAction("read")}
        className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Hepsini Okundu Yap
      </button>
    </div>
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-white lg:grid-cols-[320px_minmax(0,1fr)_280px]">
      <section className="flex min-h-0 flex-col border-r border-[#e9ebec]" ref={menuRef}>
        <header className="border-b border-[#e9ebec]">
          <div className="flex items-center justify-between gap-2 border-b border-[#e9ebec] px-3 py-2.5">
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setOpenMenu((current) => (current === "folder" ? null : "folder"))}
                className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800"
              >
                {folder === "INBOX" ? (
                  <Inbox className="h-4 w-4 shrink-0 text-[#405189]" />
                ) : folder === "ARCHIVE" ? (
                  <Archive className="h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <Trash2 className="h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span className="truncate">
                  {supportChatFolderLabel(folder)} ({folderCount(folder)})
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 ${openMenu === "folder" ? "rotate-180" : ""}`} />
              </button>
              {openMenu === "folder" ? (
                <div className="absolute top-full left-0 z-30 mt-2 w-56 rounded-lg border border-[#e9ebec] bg-white py-1 shadow-lg">
                  {(["INBOX", "ARCHIVE", "TRASH"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setFolder(value);
                        setOpenMenu(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {value === "INBOX" ? (
                        <Inbox className="h-4 w-4 text-[#405189]" />
                      ) : value === "ARCHIVE" ? (
                        <Archive className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      )}
                      <span className="flex-1">
                        {supportChatFolderLabel(value)} ({folderCount(value)})
                      </span>
                      {folder === value ? <Check className="h-4 w-4 text-[#405189]" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={!live}
                title="WhatsApp şablon mesajı ile konuşma başlat"
                onClick={() => setTemplateOpen(true)}
                className="rounded-full hover:opacity-90 disabled:opacity-40"
              >
                <SupportChatChannelLogo channel="WHATSAPP" className="h-8 w-8" badge />
              </button>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {live ? "● Canlı" : "Lisans kapalı"}
              </span>
            </span>
          </div>

          <nav className="flex border-b border-[#e9ebec]">
            {(
              [
                { id: "hepsi" as const, label: "Hepsi", count: hepsiRows.length, menu: "channels" as const },
                { id: "bot" as const, label: "Bot", count: botRows.length, menu: null },
                { id: "benim" as const, label: "Benim", count: agentCount(viewingAgentId || currentUserId), menu: "agents" as const },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <div key={item.id} className="relative min-w-0 flex-1">
                  <div
                    className={`flex items-center justify-center border-b-2 ${
                      active ? "border-[#405189]" : "border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        goTo({ tab: item.id });
                        setOpenMenu(null);
                      }}
                      className={`flex min-w-0 items-center gap-1 py-2.5 pl-2 text-[13px] ${
                        active ? "font-semibold text-[#405189]" : "font-medium text-slate-700"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] font-semibold ${
                          active ? "bg-[#405189]/15 text-[#405189]" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Filtre"
                      onClick={() => {
                        goTo({ tab: item.id });
                        if (!item.menu) {
                          setOpenMenu(null);
                          return;
                        }
                        setOpenMenu((current) => (current === item.menu ? null : item.menu));
                      }}
                      className={`py-2.5 pr-2 ${active ? "text-[#405189]" : "text-slate-400"}`}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 ${openMenu === item.menu ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {item.menu === "channels" && openMenu === "channels" ? (
                    <div className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg border border-[#e9ebec] bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setChannelFilter("all");
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span className="flex-1">Tümü ({channelCount("all")})</span>
                        {channelFilter === "all" ? <Check className="h-4 w-4 text-[#405189]" /> : null}
                      </button>
                      {SUPPORT_CHAT_CHANNELS.map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => {
                            setChannelFilter(channel);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="flex-1">
                            {supportChatChannelLabel(channel)} ({channelCount(channel)})
                          </span>
                          {channelFilter === channel ? <Check className="h-4 w-4 text-[#405189]" /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {item.menu === "agents" && openMenu === "agents" ? (
                    <div className="absolute top-full right-0 z-30 mt-1 w-64 rounded-lg border border-[#e9ebec] bg-white py-1 shadow-lg">
                      {[{ id: currentUserId, name: currentUserName, email: "" }, ...staff.filter((person) => person.id !== currentUserId)].map(
                        (person) => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              setViewingAgentId(person.id);
                              goTo({ tab: "benim" });
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span
                              className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white"
                              style={{ backgroundColor: colorFor(person.id) }}
                            >
                              {initials(staffLabel(person))}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-slate-800">
                                {person.id === currentUserId ? "Benim" : staffLabel(person)}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {person.id === currentUserId
                                  ? `${currentUserName} (${agentCount(person.id)})`
                                  : `(${agentCount(person.id)})`}
                              </span>
                            </span>
                            {viewingAgentId === person.id ? <Check className="h-4 w-4 text-[#405189]" /> : null}
                          </button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 px-3 py-2.5">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Konuşma ara..."
                className="w-full rounded-md border border-[#e9ebec] py-2 pr-3 pl-9 text-sm"
              />
            </label>
            <button
              type="button"
              title={sortMeta.title}
              onClick={toggleSortOrder}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
            >
              <sortMeta.Icon className="h-4 w-4" />
            </button>
          </div>
          {folder === "TRASH" ? (
            <div className="px-3 pb-2.5">
              {canPurgeTrash ? (
                <button
                  type="button"
                  disabled={trashBusy || folderCount("TRASH") < 1}
                  onClick={() => void emptyTrash()}
                  className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {trashBusy ? "Siliniyor…" : `Çöpü boşalt (${folderCount("TRASH")})`}
                </button>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Kalıcı silmek için Personel sayfasında Sohbet → Silme yetkisi gerekir.
                </p>
              )}
              {sendError && folder === "TRASH" ? (
                <p className="mt-1.5 text-[11px] text-rose-600">{sendError}</p>
              ) : null}
            </div>
          ) : null}
        </header>
        <ul
          ref={listRef}
          onScroll={persistListScroll}
          className={`${scrollStyles.scroll} min-h-0 flex-1 overflow-y-auto`}
        >
          {listItems.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-slate-500">
              {tab === "hepsi"
                ? "Atanmamış konuşma yok."
                : tab === "benim"
                  ? "Bu temsilcide konuşma yok."
                  : "Bot konuşmaları daha sonra eklenecek."}
            </li>
          ) : (
            listItems.map((item) => {
              if (item.kind === "agent") {
                const group = item.group;
                const unread = group.matching.reduce((sum, thread) => sum + thread.unreadCount, 0);
                const active = listFocus === "agent" && focusedAgentId === group.userId;
                return (
                  <li key={`agent:${group.userId}`}>
                    <button
                      type="button"
                      onClick={() => selectAgent(group)}
                      className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left ${
                        active
                          ? "border-[#405189] bg-[#405189]/5"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <AgentIdentity person={group.person} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {staffLabel(group.person)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {timeLabel(group.head.lastMessageAt)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] text-slate-500">Temsilci</span>
                          {group.related.length > 1 ? (
                            <span className="shrink-0 text-[11px] text-slate-400">
                              · {group.related.length} konuşma
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {group.head.customerName}
                          {group.head.lastMessagePreview ? ` · ${group.head.lastMessagePreview}` : ""}
                        </span>
                      </span>
                      {unread > 0 ? (
                        <span className="mt-1 rounded-full bg-[#405189] px-1.5 text-[11px] font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              }
              const group = item.group;
              const row = group.head;
              const unread = group.matching.reduce((sum, thread) => sum + thread.unreadCount, 0);
              const active =
                listFocus === "customer" && Boolean(selected && supportChatPersonKey(selected) === group.key);
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => selectConversation(row.id, "customer")}
                    onContextMenu={(event) => openConversationMenu(event, row)}
                    className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left ${
                      active
                        ? "border-[#405189] bg-[#405189]/5"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <ConversationIdentity row={row} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">
                          {row.customerName}
                        </span>
                        <span className="text-[11px] text-slate-400">{timeLabel(row.lastMessageAt)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <PostPreviewImage
                          src={row.sourceImage}
                          className="h-4 w-4 rounded object-cover"
                          fallback={null}
                        />
                        <span className="truncate text-[11px] text-slate-500">{row.channelLabel}</span>
                        {group.related.length > 1 ? (
                          <span className="shrink-0 text-[11px] text-slate-400">
                            · {group.related.length} konuşma
                          </span>
                        ) : null}
                      </span>
                      {row.sourceTitle ? (
                        <span className="block truncate text-[11px] text-[#405189]">{row.sourceTitle}</span>
                      ) : null}
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {row.lastMessagePreview || "Mesaj yok"}
                      </span>
                    </span>
                    {unread > 0 ? (
                      <span className="mt-1 rounded-full bg-[#405189] px-1.5 text-[11px] font-bold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="flex min-h-0 flex-col">
        {selected ? (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-5 py-3">
              <button
                type="button"
                onClick={() => setProfileConversationId(selected.id)}
                title="Müşteri profilini gör"
                className="-ml-1 flex min-w-0 items-center gap-3 rounded-md px-1 py-0.5 text-left hover:bg-slate-50"
              >
                <ConversationIdentity row={selected} size="md" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{selected.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {selected.channelLabel}
                    {selected.assignedName ? ` · ${selected.assignedName}` : " · atanmamış"}
                  </p>
                </div>
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {bulkInboxActions}
                {selected.assignedUserId ? (
                  <button
                    type="button"
                    disabled={!live}
                    onClick={() => void leaveConversation()}
                    className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Çık
                  </button>
                ) : null}
                {folder !== "ARCHIVE" ? (
                  <button
                    type="button"
                    onClick={() => void moveTo("ARCHIVE")}
                    className="rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Arşivle
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void moveTo("INBOX")}
                    className="rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Geri al
                  </button>
                )}
                {folder !== "TRASH" ? (
                  <button
                    type="button"
                    onClick={() => void moveTo("TRASH")}
                    className="rounded-md border border-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Çöpe al
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void moveTo("INBOX")}
                      className="rounded-md border border-[#e9ebec] px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Geri al
                    </button>
                    {canPurgeTrash && selected.folder === "TRASH" ? (
                      <button
                        type="button"
                        disabled={trashBusy}
                        onClick={() => void deleteForever()}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {trashBusy ? "Siliniyor…" : "Kalıcı sil"}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </header>
            <ConversationPostPreview row={selected} variant="thread" />
            <div
              ref={threadRef}
              onScroll={() => {
                if (ignoreThreadScroll.current) return;
                const thread = threadRef.current;
                if (!thread) return;
                pinThreadToLatest.current = isThreadNearBottom(thread);
              }}
              className={`${scrollStyles.scroll} ${scrollStyles.thread} min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-5 py-4`}
            >
              {threadLoading ? (
                <div className="grid h-full min-h-[12rem] place-items-center">
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#405189]" />
                    Konuşma yükleniyor…
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#e9ebec] bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Bu konuşmada henüz mesaj yok.
                </p>
              ) : (
                <div ref={threadInnerRef} className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === "OUT" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="group relative max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          message.direction === "OUT"
                            ? "bg-[#405189] text-white"
                            : "bg-white text-slate-800 shadow-sm"
                        }`}
                      >
                        {message.quote ? (
                          <div
                            className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-[11px] ${
                              message.direction === "OUT"
                                ? "border-white/70 bg-white/10 text-white/90"
                                : "border-[#405189] bg-slate-50 text-slate-500"
                            }`}
                          >
                            <p className="font-semibold">Alıntı</p>
                            <p className="line-clamp-3">{message.quote.body}</p>
                          </div>
                        ) : null}
                        <SupportChatBubbleMedia
                          items={message.media ?? []}
                          outgoing={message.direction === "OUT"}
                          onOpenImage={(item) =>
                            setLightbox({ src: item.src, alt: item.fileName || "Görsel" })
                          }
                        />
                        {visibleMessageBody(message) ? (
                          <p className={(message.media?.length ?? 0) > 0 ? "mt-1.5 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
                            {visibleMessageBody(message)}
                          </p>
                        ) : null}
                      </div>
                      {canCompose ? (
                        <button
                          type="button"
                          title="Alıntıla"
                          onClick={() =>
                            setQuoting({
                              messageId: message.id,
                              externalId: null,
                              body: supportChatMessagePreview(message.body, message.media),
                              direction: message.direction,
                            })
                          }
                          className={`absolute -top-2 ${
                            message.direction === "OUT" ? "-left-2" : "-right-2"
                          } grid h-7 w-7 place-items-center rounded-full border border-[#e9ebec] bg-white text-slate-500 opacity-0 shadow-sm group-hover:opacity-100 hover:text-[#405189]`}
                        >
                          <Quote className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
            <SupportChatComposer
              draft={draft}
              onDraftChange={setDraft}
              quoting={quoting}
              onClearQuote={() => setQuoting(null)}
              pendingFile={pendingFile}
              pendingPreview={pendingPreview}
              pendingVoice={pendingVoice}
              onClearFile={() => {
                setPendingFile(null);
                setPendingVoice(false);
              }}
              replies={replies}
              canCompose={canCompose}
              sending={sending}
              folder={folder}
              sendError={sendError}
              onSend={() => {
                void sendMessage();
              }}
              onPickFile={onPickFile}
              onVoiceRecorded={(file) => {
                setSendError(null);
                setPendingVoice(true);
                setPendingFile(file);
              }}
              onVoiceError={setSendError}
            />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex flex-wrap items-center justify-end gap-2 border-b border-[#e9ebec] px-5 py-3">
              {bulkInboxActions}
            </header>
            <div className="grid flex-1 place-items-center px-5 text-sm text-slate-500">
              <div className="flex flex-col items-center gap-3 text-center">
                <p>Soldan bir konuşma seçin veya WhatsApp şablonu ile yeni konuşma başlatın.</p>
                <button
                  type="button"
                  disabled={!live}
                  onClick={() => setTemplateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-40"
                >
                  <SupportChatChannelLogo channel="WHATSAPP" className="h-5 w-5" badge />
                  WhatsApp konuşması başlat
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="hidden min-h-0 flex-col overflow-hidden border-l border-[#e9ebec] lg:flex">
        <div className="border-b border-[#e9ebec] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {listFocus === "agent" ? "Temsilci" : "Müşteri"}
          </p>
          {listFocus === "agent" && focusedAgent ? (
            <div className="mt-2 flex items-center gap-3">
              <AgentIdentity person={focusedAgent} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{staffLabel(focusedAgent)}</p>
                <p className="text-xs text-slate-500">
                  {relatedThreads.length > 1 ? `${relatedThreads.length} konuşma` : "Temsilci"}
                </p>
              </div>
            </div>
          ) : selected ? (
            <button
              type="button"
              onClick={() => setProfileConversationId(selected.id)}
              title="Müşteri profilini gör"
              className="mt-2 flex w-full min-w-0 items-center gap-3 rounded-md text-left hover:bg-slate-50"
            >
              <ConversationIdentity row={selected} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{selected.customerName}</p>
                <p className="text-xs text-slate-500">
                  {relatedThreads.length > 1
                    ? `${relatedThreads.length} konuşma`
                    : selected.channelLabel}
                </p>
              </div>
            </button>
          ) : (
            <p className="mt-1 font-semibold text-slate-800">Seçilmedi</p>
          )}
          {selected ? <ConversationPostPreview row={selected} variant="sidebar" /> : null}
        </div>
        <div className="relative z-30 border-b border-[#e9ebec] bg-white px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Departman</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {selected
              ? selected.departmentName
                ? `Şu an: ${selected.departmentName}`
                : "Atanmamış. Konuşmayı bir departmana verin."
              : "Atamak için bir konuşma seçin."}
          </p>
          <SearchableSelect
            className="mt-2"
            value={selected?.departmentId ?? ""}
            onChange={(departmentId) => {
              void assignDepartment(departmentId);
            }}
            options={departments.map((department) => ({
              id: department.id,
              label: department.name,
              searchText: department.name,
            }))}
            placeholder="Departman seçin…"
            emptyLabel="— Atanmamış —"
            searchPlaceholder="Departman ara…"
            noResultsLabel="Departman bulunamadı"
            disabled={!live || !selected || departmentBusy || departments.length === 0}
          />
          {departments.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Departman yok. Sohbet ayarlarından ekleyebilirsiniz.
            </p>
          ) : null}
        </div>
        <div className="relative z-20 border-b border-[#e9ebec] bg-white px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Temsilci</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {selected
              ? selected.assignedName
                ? `Şu an: ${selected.assignedName}`
                : "Atanmamış. Bir temsilciye verin veya üzerinize alın."
              : "Atamak için bir konuşma seçin."}
          </p>
          <SearchableSelect
            className="mt-2"
            value={selected?.assignedUserId ?? ""}
            onChange={(userId) => {
              if (!userId) {
                void leaveConversation();
                return;
              }
              void assignConversation(userId);
            }}
            options={assignableAgentOptions}
            placeholder="Temsilci seçin…"
            emptyLabel="— Atanmamış —"
            searchPlaceholder="Temsilci ara…"
            noResultsLabel="Temsilci bulunamadı"
            disabled={!live || !selected || Boolean(assignBusyId)}
          />
          {selected && selected.assignedUserId !== currentUserId ? (
            <button
              type="button"
              disabled={!live || Boolean(assignBusyId)}
              onClick={() => void assignConversation(currentUserId)}
              className="mt-2 text-xs font-medium text-[#405189] hover:underline disabled:opacity-50"
            >
              {assignBusyId === currentUserId ? "Atanıyor…" : "Üzerime al"}
            </button>
          ) : null}
        </div>
        <div className="border-b border-[#e9ebec] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Etiketler</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <p className="text-xs text-slate-500">Etiket yok.</p>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="border-b border-[#e9ebec] px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Notlar</p>
          <p className="mt-2 text-xs text-slate-500">İç notlar bir sonraki adımda eklenecek.</p>
        </div>
        <div className={`${scrollStyles.scroll} min-h-0 flex-1 overflow-y-auto px-4 py-3`}>
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Konuşmalar{relatedThreads.length > 0 ? ` (${relatedThreads.length})` : ""}
          </p>
          {!selected ? (
            <p className="mt-2 text-xs text-slate-500">Konuşmaları görmek için bir kişi seçin.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {relatedThreads.map((thread) => {
                const active = thread.id === selectedId;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(thread.id, listFocus)}
                      onContextMenu={(event) => openConversationMenu(event, thread)}
                      className={`flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left ${
                        active
                          ? "border-[#405189]/40 bg-[#405189]/5"
                          : "border-[#e9ebec] hover:border-[#405189]/30 hover:bg-slate-50"
                      }`}
                    >
                      <SupportChatChannelLogo channel={thread.channel} className="mt-0.5 h-4 w-4" badge />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-slate-700">
                            {thread.channelLabel}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {timeLabel(thread.lastMessageAt)}
                          </span>
                        </span>
                        {thread.sourceTitle ? (
                          <span className="mt-0.5 block truncate text-[11px] text-[#405189]">
                            {thread.sourceTitle}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                          {thread.lastMessagePreview || "Mesaj yok"}
                        </span>
                        <span
                          className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${folderStatusClass(thread.folder)}`}
                        >
                          {supportChatFolderStatusLabel(thread.folder)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      {profileConversationId ? (
        <SupportChatCustomerProfileModal
          conversationId={profileConversationId}
          channel={
            rows.find((row) => row.id === profileConversationId)?.channel ??
            selected?.channel ??
            "WEB"
          }
          onClose={() => setProfileConversationId(null)}
        />
      ) : null}
      {lightbox ? (
        <SupportChatImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
      {listMenu ? (
        <ConversationContextMenu
          x={listMenu.x}
          y={listMenu.y}
          row={rows.find((item) => item.id === listMenu.row.id) ?? listMenu.row}
          currentUserId={currentUserId}
          live={live}
          onAction={(action, row) => {
            void runConversationMenuAction(action, row);
          }}
          onClose={() => setListMenu(null)}
        />
      ) : null}
      <WhatsAppTemplateModal
        open={templateOpen}
        initialRecipient={
          selected?.channel === "WHATSAPP"
            ? {
                name: selected.customerName,
                phone: normalizeWhatsAppTo(selected.customerHandle || "") || selected.customerHandle || "",
              }
            : null
        }
        onClose={() => setTemplateOpen(false)}
        onSent={(conversationId) => {
          setTemplateOpen(false);
          setFolder("INBOX");
          goTo({ tab: "benim", conversationId });
          void loadSupportChatInboxAction().then((result) => {
            if ("conversations" in result) setRows(result.conversations);
          });
        }}
      />
    </div>
  );
}
