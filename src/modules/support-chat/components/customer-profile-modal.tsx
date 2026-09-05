"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { formatCustomerDateTime } from "@/lib/customers";
import { SupportChatChannelLogo } from "@/modules/support-chat/components/channel-logo";
import { getSupportChatCustomerProfileAction } from "@/modules/support-chat/actions";
import type { SupportChatChannel, SupportChatCustomerProfile } from "@/modules/support-chat/kinds";

function ProfileAvatar({
  name,
  src,
  channel,
}: {
  name: string;
  src: string | null;
  channel: SupportChatChannel | null;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="relative h-16 w-16 shrink-0">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#405189] text-lg font-semibold text-white">
          {initials || "?"}
        </span>
      )}
      {channel ? (
        <span className="pointer-events-none absolute -right-0.5 -bottom-0.5">
          <SupportChatChannelLogo channel={channel} className="h-5 w-5" badge />
        </span>
      ) : null}
    </span>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export function SupportChatCustomerProfileModal({
  conversationId,
  channel,
  onClose,
}: {
  conversationId: string;
  channel: SupportChatChannel;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<SupportChatCustomerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getSupportChatCustomerProfileAction(conversationId).then((result) => {
      if (!active) return;
      if ("error" in result) {
        setError(result.error);
        setProfile(null);
        setLoading(false);
        return;
      }
      setProfile(result.profile);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-chat-customer-profile-title"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Müşteri profili</p>
            <h2 id="support-chat-customer-profile-title" className="mt-1 text-lg font-semibold text-slate-800">
              {profile?.name ?? "Yükleniyor"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Profil yükleniyor...
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-rose-600">{error}</p>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar name={profile.name} src={profile.avatar} channel={channel} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{profile.name}</p>
                  <p className="text-xs text-slate-500">
                    {profile.customerNo ? `#${profile.customerNo} · ` : ""}
                    {profile.sourceLabel}
                    {profile.channelLabel ? ` · ${profile.channelLabel}` : ""}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <ProfileField label="Telefon" value={profile.phone || "—"} />
                <ProfileField label="E-posta" value={profile.email || "—"} />
                <ProfileField label="Kullanıcı adı" value={profile.handle || "—"} />
                <ProfileField label="Grup" value={profile.groupLabel} />
                <ProfileField
                  label="Durum"
                  value={profile.isActive == null ? "—" : profile.isActive ? "Etkin" : "Pasif"}
                />
                <ProfileField label="Kayıt" value={formatCustomerDateTime(profile.createdAt)} />
                <ProfileField label="Sipariş" value={String(profile.orderCount)} />
                <ProfileField label="Sohbet" value={String(profile.chatCount)} />
                <ProfileField label="Adres" value={String(profile.addressCount)} />
              </dl>
              {profile.notes ? (
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Not</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{profile.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e9ebec] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e9ebec] px-4 py-2 text-sm font-medium text-slate-600"
          >
            Kapat
          </button>
          {profile?.customerUserId ? (
            <Link
              href={`/admin/members/${profile.customerUserId}`}
              className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-4 py-2 text-sm font-semibold text-white hover:bg-[#364574]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Düzenle
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
