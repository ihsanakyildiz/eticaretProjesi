import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEnabledOAuthProviderIds } from "@/auth";
import { OAuthButtons } from "@/components/site/oauth-buttons";
import { getMembershipFlags } from "@/lib/membership";
import { MemberRegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Kayıt Ol",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function KayitPage({ searchParams }: Props) {
  const params = await searchParams;
  const flags = await getMembershipFlags();
  if (!flags.allowRegister) {
    redirect("/giris");
  }
  const oauthProviders = await getEnabledOAuthProviderIds();
  const callbackUrl =
    params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/uye";

  return (
    <MemberRegisterForm
      callbackUrl={callbackUrl}
      oauthSlot={
        <OAuthButtons providers={oauthProviders} callbackUrl={callbackUrl} />
      }
    />
  );
}
