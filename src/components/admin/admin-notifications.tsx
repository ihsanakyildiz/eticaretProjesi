"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell, CheckCheck, Loader2, Mail, Reply } from "lucide-react";
import {
  fetchMailNotificationsAction,
  fetchUnreadNotificationCountAction,
  markAllMailNotificationsReadAction,
  markMailNotificationReadAction,
} from "@/app/admin/(panel)/notifications/actions";
import {
  avatarTone,
  formatMailRelativeTime,
  initialsFromName,
} from "@/lib/mail";
import type { MailNotificationItem } from "@/lib/mail-notifications";

const POLL_INTERVAL_MS = 45_000;

type AdminNotificationsProps = {
  initialUnreadCount: number;
};

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : count > 9 ? "9+" : String(count);

  return (
    <span
      className="pointer-events-none absolute top-0 right-0 z-10 flex h-[18px] min-w-[18px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

function NotificationRow({
  item,
  onNavigate,
}: {
  item: MailNotificationItem;
  onNavigate: (item: MailNotificationItem) => void;
}) {
  const isReply = item.type === "reply";
  const tone = avatarTone(item.fromEmail);

  return (
    <Link
      href={item.href}
      onClick={() => onNavigate(item)}
      className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#f3f6f9]"
    >
      <div className="relative mt-0.5 shrink-0">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${tone}`}
        >
          {initialsFromName(item.fromName, item.fromEmail)}
        </div>
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            {item.fromName}
          </p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {formatMailRelativeTime(item.receivedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              isReply
                ? "bg-[#0ab39c]/10 text-[#0ab39c]"
                : "bg-[#3577f1]/10 text-[#3577f1]"
            }`}
          >
            {isReply ? (
              <>
                <Reply className="h-3 w-3" />
                Yanıt
              </>
            ) : (
              <>
                <Mail className="h-3 w-3" />
                Yeni mesaj
              </>
            )}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-slate-700">
          {item.subject}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
          {item.preview}
        </p>
      </div>
    </Link>
  );
}

export function AdminNotifications({
  initialUnreadCount,
}: AdminNotificationsProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MailNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCountAction();
      setUnreadCount(count);
    } catch (error) {
      console.error("[notifications-count]", error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await fetchMailNotificationsAction();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error("[notifications]", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    void refreshCount();
    const interval = window.setInterval(() => {
      void refreshCount();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;

    void refresh();

    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, refresh]);

  const handleNavigate = (item: MailNotificationItem) => {
    setOpen(false);
    setUnreadCount((count) => Math.max(0, count - 1));
    setItems((current) => current.filter((row) => row.id !== item.id));

    startTransition(async () => {
      await markMailNotificationReadAction(item.id);
      router.refresh();
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllMailNotificationsReadAction();
      setItems([]);
      setUnreadCount(0);
      router.refresh();
    });
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 ${
          unreadCount > 0 ? "text-[#405189]" : ""
        }`}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} okunmamış bildirim`
            : "Bildirimler"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        <NotificationBadge count={unreadCount} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Bildirimler"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#e9ebec] bg-gradient-to-r from-[#f8f9fb] to-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Bildirimler</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} okunmamış yazışma`
                  : "Yeni bildirim yok"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : null}
              {unreadCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#405189] transition hover:bg-[#405189]/5 disabled:opacity-60"
                  title="Tümünü okundu işaretle"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümü
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto p-1.5 admin-scroll-light">
            {refreshing && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Yükleniyor…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f6f9] text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Yeni bildirim yok
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  İletişim formu veya e-posta yanıtları burada görünür.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          <div className="border-t border-[#e9ebec] bg-[#f8f9fb] px-4 py-2.5">
            <Link
              href="/admin/email"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[#405189] hover:underline"
            >
              Tüm e-postaları görüntüle
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
