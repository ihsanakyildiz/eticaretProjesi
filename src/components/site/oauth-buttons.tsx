import { signIn } from "@/auth";

const providerLabels: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
  apple: "Apple",
};

type OAuthButtonsProps = {
  providers: string[];
  callbackUrl?: string;
};

export function OAuthButtons({ providers, callbackUrl = "/uye" }: OAuthButtonsProps) {
  if (providers.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      <p className="text-center text-xs text-site-muted">veya</p>
      {providers.map((provider) => (
        <form
          key={provider}
          action={async () => {
            "use server";
            await signIn(provider, { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-site-border px-4 py-2.5 text-sm font-medium text-site-fg transition hover:bg-site-surface"
          >
            {providerLabels[provider] ?? provider} ile devam et
          </button>
        </form>
      ))}
    </div>
  );
}
