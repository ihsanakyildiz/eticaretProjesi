"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getContactFormSettings,
  parseSectionSettings,
} from "@/lib/page-sections";
import { getMailInboxConfigFromSettings } from "@/lib/mail-inbox";
import { getSettingsMapUncached } from "@/lib/settings";
import {
  getSmtpConfigFromSettings,
  isSmtpReady,
  sendMailWithConfig,
} from "@/lib/smtp";
import type { ContactFormField } from "@/config/contact-form";

export type ContactFormSubmitState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function validateField(field: ContactFormField, value: string): string | null {
  const trimmed = value.trim();
  if (field.required && field.type !== "checkbox" && !trimmed) {
    return `${field.label} zorunludur.`;
  }
  if (field.type === "checkbox" && field.required && trimmed !== "on" && trimmed !== "true") {
    return `${field.label} işaretlenmelidir.`;
  }
  if (!trimmed && field.type !== "checkbox") return null;

  switch (field.type) {
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "Geçerli bir e-posta girin.";
      }
      break;
    }
    case "url": {
      if (!URL.canParse(trimmed)) {
        return "Geçerli bir URL girin.";
      }
      break;
    }
    case "tel": {
      if (trimmed.replace(/[\s()\-+]/g, "").length < 7) {
        return "Geçerli bir telefon girin.";
      }
      break;
    }
    case "number": {
      if (!Number.isFinite(Number(trimmed))) {
        return "Geçerli bir sayı girin.";
      }
      break;
    }
    case "select":
    case "radio": {
      const allowed = (field.options ?? []).map((option) => option.value);
      if (allowed.length > 0 && !allowed.includes(trimmed)) {
        return "Geçersiz seçim.";
      }
      break;
    }
    default:
      break;
  }
  return null;
}

export async function submitContactFormAction(
  _prev: ContactFormSubmitState,
  formData: FormData,
): Promise<ContactFormSubmitState> {
  try {
    const sectionId = String(formData.get("sectionId") ?? "").trim();
    if (!sectionId) return { error: "Form bulunamadı." };

    // Honeypot
    const honeypot = String(formData.get("website_url") ?? "").trim();
    if (honeypot) {
      return { success: true, message: "Mesajınız alındı." };
    }

    const section = await prisma.pageSection.findFirst({
      where: {
        id: sectionId,
        type: "CONTACT_FORM",
        isActive: true,
        page: { isActive: true },
      },
      select: {
        id: true,
        settings: true,
        title: true,
        page: { select: { title: true, slug: true } },
      },
    });

    if (!section) return { error: "İletişim formu bulunamadı." };

    const config = getContactFormSettings(parseSectionSettings(section.settings));
    const fieldErrors: Record<string, string> = {};
    const values: Record<string, string> = {};

    for (const field of config.fields) {
      if (field.type === "hidden") {
        values[field.name] =
          String(formData.get(field.name) ?? field.defaultValue ?? "").trim();
        continue;
      }

      const raw =
        field.type === "checkbox"
          ? formData.get(field.name) != null
            ? "on"
            : ""
          : String(formData.get(field.name) ?? "");

      const error = validateField(field, raw);
      if (error) fieldErrors[field.name] = error;
      values[field.name] = field.type === "checkbox" ? (raw ? "Evet" : "Hayır") : raw.trim();
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { error: "Lütfen formu kontrol edin.", fieldErrors };
    }

    const settings = await getSettingsMapUncached();
    const inbox = getMailInboxConfigFromSettings(settings);
    const smtp = getSmtpConfigFromSettings(settings);

    const fromName =
      values.name || values.ad || values.adsoyad || values.fullname || "Ziyaretçi";
    const fromEmail =
      values.email || values.eposta || values.mail || smtp.notifyEmail || smtp.fromEmail;
    const subjectValue = values.subject || values.konu || section.title || "İletişim formu";
    const prefix = inbox.contactSubjectPrefix || "[İletişim Formu]";
    const subject = `${prefix} ${subjectValue}`.trim();

    const bodyLines = config.fields
      .filter((field) => field.type !== "hidden")
      .map((field) => `${field.label}: ${values[field.name] ?? ""}`);

    const bodyText = [
      `Sayfa: ${section.page.title} (/${section.page.slug})`,
      "",
      ...bodyLines,
    ].join("\n");

    const preview = bodyText.replace(/\s+/g, " ").slice(0, 180);

    if (inbox.storeContactMessages) {
      const externalId = `contact.${crypto.randomUUID()}@local`;
      await prisma.mailMessage.create({
        data: {
          folder: "INBOX",
          source: "CONTACT_FORM",
          fromName: String(fromName).slice(0, 191),
          fromEmail: String(fromEmail || "noreply@local").slice(0, 191),
          toEmail: (smtp.notifyEmail || smtp.fromEmail || "admin@local").slice(0, 191),
          replyToEmail: values.email || values.eposta || null,
          subject: subject.slice(0, 500),
          preview,
          bodyText,
          label: "contact",
          isRead: false,
          externalId,
          receivedAt: new Date(),
        },
      });
      revalidatePath("/admin/email");
    }

    if (isSmtpReady(smtp) && smtp.notifyEmail) {
      try {
        await sendMailWithConfig(smtp, {
          to: smtp.notifyEmail,
          subject,
          text: bodyText,
          replyTo: values.email || values.eposta || smtp.replyTo || undefined,
        });
      } catch (error) {
        console.error("[contact-form-smtp]", error);
        if (!inbox.storeContactMessages) {
          return {
            error:
              "Mesaj kaydedilemedi. Lütfen daha sonra tekrar deneyin veya doğrudan e-posta gönderin.",
          };
        }
      }
    }

    if (!inbox.storeContactMessages && !(isSmtpReady(smtp) && smtp.notifyEmail)) {
      return {
        error:
          "İletişim formu henüz yapılandırılmadı. Admin panelinde e-posta ayarlarını kontrol edin.",
      };
    }

    return {
      success: true,
      message: config.successMessage || "Mesajınız alındı.",
    };
  } catch (error) {
    console.error("[contact-form]", error);
    return { error: "Mesaj gönderilirken bir hata oluştu." };
  }
}
