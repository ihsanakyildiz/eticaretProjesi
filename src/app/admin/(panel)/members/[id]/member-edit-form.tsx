"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { updateMemberAction, type MemberFormState } from "../actions";

const initial: MemberFormState = {};

type Props = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
};

export function MemberEditForm({ id, name, email, phone, isActive }: Props) {
  const [state, formAction, isPending] = useActionState(updateMemberAction, initial);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={id} />
      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Ad Soyad</label>
          <input
            name="name"
            defaultValue={name}
            required
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">E-posta</label>
          <input
            name="email"
            type="email"
            defaultValue={email}
            required
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Telefon</label>
          <input
            name="phone"
            defaultValue={phone}
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Yeni şifre (opsiyonel)
          </label>
          <input
            name="password"
            type="password"
            minLength={6}
            placeholder="Değiştirmek için yazın"
            className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
          />
        </div>
        <div className="md:col-span-2">
          <AdminSwitch name="isActive" label="Aktif üye" defaultChecked={isActive} />
        </div>
      </div>

      <div className="flex justify-between">
        <Link
          href="/admin/members"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          Listeye dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>
    </form>
  );
}
