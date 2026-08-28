"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { stripHtml } from "@/lib/html";

export type ProjectFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function ProjectFaqAccordion({
  title = "Hizmet hakkında sorular",
  items,
}: {
  title?: string;
  items: ProjectFaqItem[];
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  if (items.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="font-display text-2xl font-bold text-site-fg">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-site-border bg-site-card"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span className="text-sm font-semibold text-site-fg">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-site-muted transition ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open ? (
                <div className="border-t border-site-border px-4 pt-3 pb-4 text-sm leading-relaxed text-site-muted">
                  {stripHtml(item.answer)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
