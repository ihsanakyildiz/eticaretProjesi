import { isSupportChatInboxHref } from "@/modules/support-chat/kinds";

export { isSupportChatInboxHref };

export async function isSupportChatLicensedSafe() {
  try {
    const { isSupportChatLicensed } = await import("@/modules/support-chat/license");
    return await isSupportChatLicensed();
  } catch {
    return false;
  }
}
