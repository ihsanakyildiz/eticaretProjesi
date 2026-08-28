import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { isSettingEnabled, getSettingsMap } from "@/lib/settings";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  if (session.user.role !== Role.MEMBER && session.user.role !== Role.ADMIN) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function isMembershipEnabled() {
  try {
    const settings = await getSettingsMap();
    return isSettingEnabled(settings, "membership_enabled", false);
  } catch {
    return false;
  }
}

export async function getMembershipFlags() {
  try {
    const settings = await getSettingsMap();
    return {
      enabled: isSettingEnabled(settings, "membership_enabled", false),
      allowRegister: isSettingEnabled(settings, "membership_allow_register", true),
      stripeEnabled: isSettingEnabled(settings, "membership_stripe_enabled", false),
      oauthGoogle: isSettingEnabled(settings, "membership_oauth_google", false),
      oauthGithub: isSettingEnabled(settings, "membership_oauth_github", false),
      oauthFacebook: isSettingEnabled(settings, "membership_oauth_facebook", false),
      oauthApple: isSettingEnabled(settings, "membership_oauth_apple", false),
    };
  } catch {
    return {
      enabled: false,
      allowRegister: false,
      stripeEnabled: false,
      oauthGoogle: false,
      oauthGithub: false,
      oauthFacebook: false,
      oauthApple: false,
    };
  }
}
