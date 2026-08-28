"use client";

import dynamic from "next/dynamic";

export const RichTextEditor = dynamic(
  () =>
    import("./rich-text-editor-impl").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[140px] rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
        <div className="h-10 border-b border-[#e9ebec] bg-white" />
        <p className="px-3 py-3 text-sm text-slate-400">Editör yükleniyor…</p>
      </div>
    ),
  },
);
