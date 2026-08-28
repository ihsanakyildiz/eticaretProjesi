"use server";

import { auth } from "@/auth";
import { getSettingsMapUncached } from "@/lib/settings";
import { getSmtpConfigFromSettings, sendSmtpTestEmail } from "@/lib/smtp";

export type MailTestState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function sendSmtpTestEmailAction(
  _prev: MailTestState,
  formData: FormData,
): Promise<MailTestState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı." };
  }

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
