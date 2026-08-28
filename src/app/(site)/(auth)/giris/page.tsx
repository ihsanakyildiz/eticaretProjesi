import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEnabledOAuthProviderIds } from "@/auth";
import { OAuthButtons } from "@/components/site/oauth-buttons";
import { getMembershipFlags } from "@/lib/membership";
import { MemberLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Giriş Yap",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string; registered?: string }>;
};

export default async function GirisPage({ searchParams }: Props) {
  const params = await searchParams;
  const flags = await getMembershipFlags();
  const oauthProviders = await getEnabledOAuthProviderIds();

  return (
    <MemberLoginForm
      callbackUrl={params.callbackUrl || "/uye"}
      allowRegister={flags.allowRegister}
      registered={params.registered === "1"}
      oauthSlot={
        <OAuthButtons
          providers={oauthProviders}
          callbackUrl={params.callbackUrl || "/uye"}
        />
      }
    />
  );
}
