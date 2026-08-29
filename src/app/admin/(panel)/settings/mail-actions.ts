"use server";

import { getSettingsMapUncached } from "@/lib/settings";
import { getSmtpConfigFromSettings, sendSmtpTestEmail } from "@/lib/smtp";
import { requirePermission } from "@/lib/staff-permissions";

export type MailTestState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function sendSmtpTestEmailAction(
  _prev: MailTestState,
  formData: FormData,
): Promise<MailTestState> {
  const gate = await requirePermission("settings", "update");
  if (!gate.ok) return { error: gate.error };

  try {
    const settings = await getSettingsMapUncached();
    const config = getSmtpConfigFromSettings(settings);
    const to = String(formData.get("test_to") ?? "").trim();

    await sendSmtpTestEmail(config, to || undefined);

    const destination = to || config.notifyEmail || config.fromEmail;
    return {
      success: true,
      message: `Test e-postası gönderildi: ${destination}. Gelen kutusunu (ve spam klasörünü) kontrol edin.`,
    };
  } catch (error) {
    console.error("[smtp-test]", error);
    const message =
      error instanceof Error ? error.message : "Test e-postası gönderilemedi.";
    return { error: message };
  }
}
