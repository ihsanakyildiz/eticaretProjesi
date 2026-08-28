"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function SystemHealthRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [generatedAt]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 12_000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <button
      type="button"
      onClick={() => {
        setPending(true);
        router.refresh();
      }}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Yenileniyor..." : "Yenile"}
    </button>
  );
}
