"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Loader2, MailOpen, Paperclip, Star } from "lucide-react";
import { loadMoreMailMessagesAction } from "@/app/admin/(panel)/email/actions";
import {
  avatarTone,
  formatMailDate,
  initialsFromName,
  type MailFolderKey,
  type MailListItem,
} from "@/lib/mail";

type EmailInfiniteListProps = {
  folder: MailFolderKey;
  label: string | null;
  query: string;
  selectedId: string | null;
  initialItems: MailListItem[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  buildHref: (parts: {
    folder?: string;
    label?: string | null;
    id?: string | null;
    q?: string;
  }) => string;
  onToggleStar: (id: string) => void;
};

export function EmailInfiniteList({
  folder,
  label,
  query,
  selectedId,
  initialItems,
  initialNextCursor,
  initialHasMore,
  buildHref,
  onToggleStar,
}: EmailInfiniteListProps) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
    setHasMore(initialHasMore);
    setLoadError(null);
    loadingRef.current = false;
  }, [initialItems, initialNextCursor, initialHasMore, folder, label, query]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current || !nextCursor) return;

    loadingRef.current = true;
    setLoadingMore(true);
    setLoadError(null);

    try {
      const page = await loadMoreMailMessagesAction({
        folder,
        label,
        q: query,
        cursor: nextCursor,
      });

      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        const merged = [...current];
        for (const item of page.items) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("[mail-load-more]", error);
      setLoadError("Daha fazla mesaj yüklenemedi.");
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [folder, label, query, hasMore, nextCursor]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleToggleStar = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item,
      ),
    );
    onToggleStar(id);
  };

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
        <MailOpen className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">Bu klasör boş</p>
        <p className="mt-1 text-xs text-slate-400">
          İletişim formu mesajları burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-[#eef0f2]">
        {items.map((item) => {
          const active = selectedId === item.id;
          return (
            <li key={item.id}>
              <Link
                href={buildHref({
                  folder,
                  label,
                  q: query,
                  id: item.id,
                })}
                className={`block px-3 py-3.5 transition ${
                  active ? "bg-[#3577f1]/08" : "hover:bg-slate-50"
                } ${!item.isRead ? "bg-[#f7f9fc]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(
                      item.fromEmail,
                    )}`}
                  >
                    {initialsFromName(item.fromName, item.fromEmail)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p
                        className={`min-w-0 flex-1 truncate text-sm ${
                          item.isRead
                            ? "font-medium text-slate-700"
                            : "font-semibold text-slate-900"
                        }`}
                      >
                        {item.fromName}
                      </p>
                      <div className="flex shrink-0 items-center gap-1 text-slate-400">
                        {item.hasAttachment ? (
                          <Paperclip className="h-3.5 w-3.5" />
                        ) : null}
                        <button
                          type="button"
                          className={`rounded p-0.5 ${
                            item.isStarred
                              ? "text-[#f7b84b]"
                              : "hover:text-[#f7b84b]"
                          }`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleToggleStar(item.id);
                          }}
                          aria-label="Yıldızla"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              item.isStarred ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-sm ${
                        item.isRead
                          ? "text-slate-600"
                          : "font-medium text-slate-800"
                      }`}
                    >
                      {item.subject}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {item.preview}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {formatMailDate(item.receivedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="px-3 py-4 text-center">
        {loadingMore ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Daha fazla yükleniyor…
          </span>
        ) : loadError ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-xs font-medium text-[#3577f1] hover:underline"
          >
            {loadError} Tekrar dene
          </button>
        ) : hasMore ? (
          <span className="text-xs text-slate-400">Kaydırarak daha fazla yükle</span>
        ) : items.length > 0 ? (
          <span className="text-xs text-slate-400">Tüm mesajlar yüklendi</span>
        ) : null}
      </div>
    </>
  );
}
