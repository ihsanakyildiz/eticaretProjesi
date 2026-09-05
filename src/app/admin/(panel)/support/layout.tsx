import type { ReactNode } from "react";

export default function SupportInboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-4 h-[calc(100dvh-4rem)] overflow-hidden border-t border-[#e9ebec] lg:-m-6 lg:h-[calc(100dvh-4rem)]">
      {children}
    </div>
  );
}
