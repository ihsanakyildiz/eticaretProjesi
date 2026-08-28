"use client";

import { useActionState, useRef, useState } from "react";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import {
  removeMemberAvatarFormAction,
  updateMemberAvatarAction,
  updateMemberPasswordAction,
  updateMemberProfileAction,
  type ProfileFormState,
} from "./actions";

const initial: ProfileFormState = {};

type Props = {
  name: string;
  email: string;
  phone: string;
  image: string;
  hasPassword: boolean;
};

export function MemberProfileForms({ name, email, phone, image, hasPassword }: Props) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateMemberProfileAction,
    initial,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updateMemberPasswordAction,
    initial,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    updateMemberAvatarAction,
    initial,
  );
  const [preview, setPreview] = useState(image);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Profil fotoğrafı</h2>
        <form action={avatarAction} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-site-border bg-site-surface">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-site-muted" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-site-border px-3 py-2 text-sm"
              >
                <Upload className="h-4 w-4" />
                Seç
              </button>
              <button
                type="submit"
                disabled={avatarPending}
                className="inline-flex items-center gap-2 rounded-lg bg-site-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {avatarPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Yükle
              </button>
              {image ? (
                <button
                  type="submit"
                  formAction={removeMemberAvatarFormAction}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Kaldır
                </button>
              ) : null}
            </div>
            {avatarState.error ? (
              <p className="text-xs text-rose-600">{avatarState.error}</p>
            ) : null}
            {avatarState.success ? (
              <p className="text-xs text-emerald-600">{avatarState.message}</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Profil bilgileri</h2>
        {profileState.error ? (
          <p className="mt-3 text-sm text-rose-600">{profileState.error}</p>
        ) : null}
        {profileState.success ? (
          <p className="mt-3 text-sm text-emerald-600">{profileState.message}</p>
        ) : null}
        <form action={profileAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Ad Soyad</label>
            <input
              name="name"
              defaultValue={name}
              required
              className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-posta</label>
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Telefon</label>
            <input
              name="phone"
              defaultValue={phone}
              className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={profilePending}
              className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Şifre</h2>
        {passwordState.error ? (
          <p className="mt-3 text-sm text-rose-600">{passwordState.error}</p>
        ) : null}
        {passwordState.success ? (
          <p className="mt-3 text-sm text-emerald-600">{passwordState.message}</p>
        ) : null}
        <form action={passwordAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          {hasPassword ? (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Mevcut şifre</label>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
              />
            </div>
          ) : (
            <p className="sm:col-span-2 text-sm text-site-muted">
              Sosyal giriş ile kayıt oldunuz. İlk şifrenizi burada belirleyebilirsiniz.
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Yeni şifre</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Yeni şifre (tekrar)</label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={passwordPending}
              className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {passwordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Şifreyi Güncelle
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
