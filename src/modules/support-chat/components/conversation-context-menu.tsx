"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Mail, MailOpen, Trash2, UserRound } from "lucide-react";
import type { SupportChatConversationRow } from "@/modules/support-chat/kinds";

export type ConversationContextAction =
  | "take"
  | "archive"
  | "trash"
  | "read"
  | "unread";

export function ConversationContextMenu({
  x,
  y,
  row,
  currentUserId,
  live,
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  row: SupportChatConversationRow;
  currentUserId: string;
  live: boolean;
  onAction: (action: ConversationContextAction, row: SupportChatConversationRow) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const mine = row.assignedUserId === currentUserId;
  const unread = row.unreadCount > 0;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const items: Array<{
    id: ConversationContextAction;
    label: string;
    Icon: typeof UserRound;
    disabled: boolean;
    danger?: boolean;
  }> = [
    { id: "take", label: "Üstüme Al", Icon: UserRound, disabled: !live || mine },
    { id: "archive", label: "Arşive Al", Icon: Archive, disabled: !live || row.folder === "ARCHIVE" },
    { id: "trash", label: "Çöpe Al", Icon: Trash2, disabled: !live || row.folder === "TRASH", danger: true },
    { id: "read", label: "Okundu Yap", Icon: MailOpen, disabled: !live || !unread },
    { id: "unread", label: "Okunmadı Yap", Icon: Mail, disabled: !live || unread },
  ];

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[90] min-w-44 rounded-lg border border-[#e9ebec] bg-white py-1 shadow-lg"
    >
      {items.map((item, index) => (
        <div key={item.id}>
          {index === 3 ? <div className="my-1 border-t border-[#e9ebec]" /> : null}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              onAction(item.id, row);
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-40 ${
              item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <item.Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
