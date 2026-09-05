"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORT_CHAT_SETTINGS_LINKS } from "@/modules/support-chat/kinds";

export function SupportChatSettingsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 rounded-lg border border-[#e9ebec] bg-white p-2 shadow-sm">
      {SUPPORT_CHAT_SETTINGS_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              active
                ? "bg-[#405189] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
