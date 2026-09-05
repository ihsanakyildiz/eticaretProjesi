"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  createSupportChatDepartmentAction,
  deleteSupportChatDepartmentAction,
  updateSupportChatDepartmentAction,
} from "@/modules/support-chat/actions";
import type { SupportChatDepartmentRow } from "@/modules/support-chat/kinds";

const DEPARTMENT_COLORS = ["#3577f1", "#f7b84b", "#0ab39c", "#f06548", "#6559cc", "#405189"];
const ORDER_BADGES = [
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function nextDepartmentName(departments: SupportChatDepartmentRow[]) {
  const used = new Set(departments.map((item) => item.name.trim().toLocaleLowerCase("tr-TR")));
  if (!used.has("yeni departman")) return "Yeni departman";
  for (let index = 2; index < 500; index += 1) {
    const name = `Yeni departman ${index}`;
    if (!used.has(name.toLocaleLowerCase("tr-TR"))) return name;
  }
  return `Yeni departman ${Date.now()}`;
}

export function SupportChatDepartmentsForm({
  departments,
}: {
  departments: SupportChatDepartmentRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(departments.map((item) => [item.id, item.name])),
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(departments.map((item) => [item.id, item.name])));
  }, [departments]);

  function refresh() {
    router.refresh();
  }

  function run(task: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="border-b border-[#e9ebec] px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Departman listesi
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Ek destek departmanları ekleyin ve yönetin (isim ve renk).
        </p>
      </div>
      <div className="space-y-3 p-5">
        {departments.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#e9ebec] px-4 py-8 text-center text-sm text-slate-500">
            Henüz departman yok. Yeni öğe ekleyin.
          </p>
        ) : (
          <ul className="space-y-3">
            {departments.map((department, index) => (
              <li key={department.id} className="flex items-center gap-3">
                <div className="w-12 shrink-0">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Sıra
                  </p>
                  <span
                    className={`mt-1 grid h-8 w-8 place-items-center rounded-md text-xs font-semibold ${
                      ORDER_BADGES[index % ORDER_BADGES.length]
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
                <input
                  value={drafts[department.id] ?? department.name}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [department.id]: event.target.value }))
                  }
                  onBlur={() => {
                    const name = (drafts[department.id] ?? department.name).trim();
                    if (name === department.name) return;
                    const form = new FormData();
                    form.set("id", department.id);
                    form.set("name", name);
                    form.set("color", department.color);
                    run(() => updateSupportChatDepartmentAction(form));
                  }}
                  disabled={pending}
                  className="min-w-0 flex-1 rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#405189]"
                />
                <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center">
                  <span
                    className="h-8 w-8 rounded-full border border-[#e9ebec] shadow-sm"
                    style={{ backgroundColor: department.color }}
                  />
                  <input
                    type="color"
                    value={department.color}
                    disabled={pending}
                    onChange={(event) => {
                      const form = new FormData();
                      form.set("id", department.id);
                      form.set("name", drafts[department.id] ?? department.name);
                      form.set("color", event.target.value);
                      run(() => updateSupportChatDepartmentAction(form));
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    title="Renk seç"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  title="Sil"
                  onClick={() => {
                    const form = new FormData();
                    form.set("id", department.id);
                    run(() => deleteSupportChatDepartmentAction(form));
                  }}
                  className="grid h-9 w-9 place-items-center rounded-md border border-[#e9ebec] text-slate-400 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const form = new FormData();
            form.set("name", nextDepartmentName(departments));
            form.set("color", DEPARTMENT_COLORS[departments.length % DEPARTMENT_COLORS.length] ?? "#405189");
            run(() => createSupportChatDepartmentAction(form));
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Yeni öğe ekle
        </button>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
