import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { SupportChatErrorBoundary } from "@/modules/support-chat/components/error-boundary";
import { SupportChatSettingsSubnav } from "@/modules/support-chat/components/settings-subnav";

export function SupportChatSettingsFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SupportChatErrorBoundary>
      <div className="space-y-5">
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Ayarlar · Sohbet
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
            <MessageCircle className="h-6 w-6 text-[#405189]" />
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <SupportChatSettingsSubnav />
        {children}
      </div>
    </SupportChatErrorBoundary>
  );
}
