import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Şifre Sıfırla",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SifreSifirlaPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="rounded-2xl border border-site-border bg-site-card p-6 text-center sm:p-8">
        <h1 className="text-xl font-bold text-site-fg">Geçersiz bağlantı</h1>
        <p className="mt-2 text-sm text-site-muted">Şifre sıfırlama bağlantısı eksik veya hatalı.</p>
        <Link href="/sifremi-unuttum" className="mt-4 inline-block text-sm text-site-primary">
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
