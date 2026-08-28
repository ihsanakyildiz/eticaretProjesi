import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Giriş | İhsan Akyıldız",
  description: "Yönetim paneline giriş yapın",
};

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.id && session.user.role === Role.ADMIN) {
    redirect("/admin");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f6f9]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(10,179,156,0.12), transparent 42%), radial-gradient(circle at 88% 12%, rgba(64,81,137,0.14), transparent 40%), linear-gradient(160deg, #eef2f7 0%, #f8fafc 55%, #eef6f4 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)] lg:grid-cols-2">
          <aside className="relative hidden min-h-[560px] bg-[#405189] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(10,179,156,0.45), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.12), transparent 40%)",
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg font-bold tracking-tight">
                  IA
                </span>
                <span className="text-xl font-semibold tracking-wide">İhsan Akyıldız</span>
              </div>
              <h1 className="mt-10 max-w-sm text-3xl leading-tight font-semibold">
                Yönetim paneline hoş geldiniz
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                Projeler, çalışmalar, blog içerikleri ve sayfalarınızı tek panelden yönetin.
              </p>
            </div>

            <div className="relative space-y-3 text-sm text-white/70">
              <p>Web tasarım & yazılım</p>
              <p className="text-xs text-white/50">© {new Date().getFullYear()} İhsan Akyıldız</p>
            </div>
          </aside>

          <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#405189] text-sm font-bold text-white">
                  IA
                </span>
                <span className="text-lg font-semibold text-slate-800">İhsan Akyıldız</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800">Giriş Yap</h2>
              <p className="mt-2 text-sm text-slate-500">
                Devam etmek için yönetici hesabınızla oturum açın.
              </p>
            </div>

            <LoginForm />
          </section>
        </div>
      </div>
    </div>
  );
}
