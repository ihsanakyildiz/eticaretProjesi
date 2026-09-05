"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SUPPORT_CHAT_CHANNEL_GROUPS,
  supportChatChannelGroupFromSlug,
  supportChatChannelGroupLabel,
  supportChatChannelGroupSettingsHref,
} from "@/modules/support-chat/kinds";

export function SupportChatChannelSubnav() {
  const pathname = usePathname();
  const slug = pathname.split("/").at(-1) ?? "";
  const current = supportChatChannelGroupFromSlug(slug);
  return (
    <nav className="flex flex-wrap gap-1.5">
      {SUPPORT_CHAT_CHANNEL_GROUPS.map((group) => {
        const href = supportChatChannelGroupSettingsHref(group);
        const active = current === group;
        return (
          <Link
            key={group}
            href={href}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              active
                ? "bg-[#405189] text-white"
                : "border border-[#e9ebec] bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {supportChatChannelGroupLabel(group)}
          </Link>
        );
      })}
    </nav>
  );
}
