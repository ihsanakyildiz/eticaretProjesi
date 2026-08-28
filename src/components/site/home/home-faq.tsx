"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { stripHtml } from "@/lib/html";

export type FaqViewItem = {
  id: string;
  question: string;
  answer: string;
};

const FALLBACK: FaqViewItem[] = [
  {
    id: "1",
    question: "Proje süreci nasıl işliyor?",
    answer:
      "Önce ihtiyaç analizi yapıyoruz, ardından tasarım ve geliştirme aşamalarına geçiyoruz. Teslim sonrası destek sağlıyoruz.",
  },
  {
    id: "2",
    question: "Teklif almak ücretsiz mi?",
    answer: "Evet. Proje kapsamını netleştirdikten sonra ücretsiz teklif hazırlıyoruz.",
  },
  {
    id: "3",
    question: "Teslim sonrası destek var mı?",
    answer:
      "Evet. Anlaşmaya bağlı olarak bakım, güncelleme ve teknik destek hizmeti sunuyoruz.",
  },
  {
    id: "4",
    question: "Projeler ne kadar sürer?",
    answer:
      "Kapsama göre değişir. Tipik bir kurumsal site birkaç hafta, özel yazılımlar ise daha uzun sürebilir.",
  },
];

export function HomeFaq({
  items,
  title,
  subtitle,
}: {
  items?: FaqViewItem[];
  title?: string | null;
  subtitle?: string | null;
}) {
  const list = items && items.length > 0 ? items : FALLBACK;
  const [openId, setOpenId] = useState<string | null>(list[0]?.id ?? null);
  const mid = Math.ceil(list.length / 2);
  const columns = [list.slice(0, mid), list.slice(mid)];
  const heading = title?.trim() || "Bize her şeyi sorun";
  const lead =
    subtitle?.trim() ||
    "Sık sorulan sorulara hızlı yanıtlar. Daha fazlası için iletişime geçin.";

  return (
    <section className="bg-site-surface py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 text-site-muted">{lead}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {col.map((item) => {
                const open = openId === item.id;
                const answerText = stripHtml(item.answer);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-site-border bg-site-card px-5 py-4 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <span className="text-sm font-semibold text-site-fg sm:text-base">
                        {item.question}
                      </span>
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-site-primary-soft text-site-primary">
                        {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                    {open ? (
                      <p className="mt-3 border-t border-site-border pt-3 text-sm leading-relaxed text-site-muted">
                        {answerText}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
