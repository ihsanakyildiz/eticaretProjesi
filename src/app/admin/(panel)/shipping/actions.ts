"use server";

import { ShippingCarrierProvider } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isShippingCarrierProviderId } from "@/config/shipping-carriers";
import { normalizeProjectUrl } from "@/lib/project-portfolio";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requirePermission } from "@/lib/staff-permissions";
import { deletePublicAsset, saveOptimizedImage, uploadLimits } from "@/lib/uploads";
import {
  parseArasApiSettings,
  parseArasEnvironment,
  serializeArasApiSettings,
  testArasConnection,
} from "@/lib/aras-kargo";
import {
  parseYurticiApiSettings,
  parseYurticiEnvironment,
  parseYurticiLanguage,
  serializeYurticiApiSettings,
  testYurticiConnection,
} from "@/lib/yurtici-kargo";

export type ShippingCarrierFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteShippingCarrierResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidateShippingAdmin(id?: string) {
  revalidatePath("/admin/shipping");
  if (id) revalidatePath(`/admin/shipping/${id}/edit`);
}

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function parseProvider(raw: string): ShippingCarrierProvider {
  const value = raw.trim();
  if (!isShippingCarrierProviderId(value)) return ShippingCarrierProvider.CUSTOM;
  switch (value) {
    case "CUSTOM":
      return ShippingCarrierProvider.CUSTOM;
    case "YURTICI":
      return ShippingCarrierProvider.YURTICI;
    case "ARAS":
      return ShippingCarrierProvider.ARAS;
    case "MNG":
      return ShippingCarrierProvider.MNG;
    case "PTT":
      return ShippingCarrierProvider.PTT;
    case "SURAT":
      return ShippingCarrierProvider.SURAT;
    case "UPS":
      return ShippingCarrierProvider.UPS;
    case "DHL":
      return ShippingCarrierProvider.DHL;
    case "FEDEX":
      return ShippingCarrierProvider.FEDEX;
    case "HOROZ":
      return ShippingCarrierProvider.HOROZ;
    case "HEPSIJET":
      return ShippingCarrierProvider.HEPSIJET;
    case "TRENDYOL_EXPRESS":
      return ShippingCarrierProvider.TRENDYOL_EXPRESS;
    case "KOLAY_GELSIN":
      return ShippingCarrierProvider.KOLAY_GELSIN;
    case "SENDEO":
      return ShippingCarrierProvider.SENDEO;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

async function uniqueCarrierSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "kargo-firmasi";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.shippingCarrier.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

function parseCarrierPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const provider = parseProvider(String(formData.get("provider") ?? ""));
  const emailRaw = String(formData.get("email") ?? "").trim().slice(0, 191);
  const email = emailRaw || null;
  const phone = emptyToNull(String(formData.get("phone") ?? ""), 50);
  const website = normalizeProjectUrl(String(formData.get("website") ?? ""));
  const trackingUrlTemplate = emptyToNull(
    String(formData.get("trackingUrlTemplate") ?? ""),
    500,
  );
  const notes = emptyToNull(String(formData.get("notes") ?? ""), 10_000);
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingLogo = String(formData.get("logo") ?? "").trim();
  const logoFile = formData.get("logo_file");
  const apiUsername = String(formData.get("apiUsername") ?? "").trim().slice(0, 100);
  const apiPassword = String(formData.get("apiPassword") ?? "");
  const apiCustomerCode = String(formData.get("apiCustomerCode") ?? "").trim().slice(0, 50);
  const apiEnvironment = parseYurticiEnvironment(String(formData.get("apiEnvironment") ?? "test"));
  const apiLanguage = parseYurticiLanguage(String(formData.get("apiLanguage") ?? "TR"));

  return {
    name,
    slugInput,
    provider,
    email,
    phone,
    website,
    trackingUrlTemplate,
    notes,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    existingLogo,
    logoFile,
    apiUsername,
    apiPassword,
    apiCustomerCode,
    apiEnvironment,
    apiLanguage,
  };
}

function nextApiSettings(
  payload: ReturnType<typeof parseCarrierPayload>,
  previousRaw: string | null,
) {
  if (payload.provider === ShippingCarrierProvider.YURTICI) {
    const previous = parseYurticiApiSettings(previousRaw);
    const password = payload.apiPassword || previous?.password || "";
    if (!payload.apiUsername && !password) return previousRaw;
    return serializeYurticiApiSettings({
      provider: "YURTICI",
      environment: payload.apiEnvironment,
      username: payload.apiUsername || previous?.username || "",
      password,
      language: payload.apiLanguage,
    });
  }
  if (payload.provider === ShippingCarrierProvider.ARAS) {
    const previous = parseArasApiSettings(previousRaw);
    const password = payload.apiPassword || previous?.password || "";
    if (!payload.apiUsername && !password && !payload.apiCustomerCode) return previousRaw;
    return serializeArasApiSettings({
      provider: "ARAS",
      environment: parseArasEnvironment(payload.apiEnvironment),
      username: payload.apiUsername || previous?.username || "",
      password,
      customerCode: payload.apiCustomerCode || previous?.customerCode || "",
    });
  }
  return previousRaw;
}

function validatePayload(payload: ReturnType<typeof parseCarrierPayload>) {
  const fieldErrors: Record<string, string> = {};
  if (!payload.name) fieldErrors.name = "Zorunlu alan";
  if (payload.email && !EMAIL_RE.test(payload.email)) {
    fieldErrors.email = "Geçerli bir e-posta girin";
  }
  return fieldErrors;
}

async function saveLogo(
  logoFile: FormDataEntryValue | null,
  existingLogo: string,
  previousPath?: string | null,
) {
  let logo = existingLogo;
  if (logoFile instanceof File && logoFile.size > 0) {
    const saved = await saveOptimizedImage(logoFile, {
      uploadDir: "uploads/shipping/carriers",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: previousPath || undefined,
    });
    logo = saved.publicPath;
  }
  return logo;
}

export async function createShippingCarrierAction(
  _prev: ShippingCarrierFormState,
  formData: FormData,
): Promise<ShippingCarrierFormState> {
  const gate = await requirePermission("shipping", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseCarrierPayload(formData);
  const fieldErrors = validatePayload(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Formdaki hataları düzeltin.", fieldErrors };
  }

  try {
    const slug = await uniqueCarrierSlug(payload.slugInput || payload.name);
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.shippingCarrier.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const logo = await saveLogo(payload.logoFile, payload.existingLogo);

    await prisma.shippingCarrier.create({
      data: {
        name: payload.name,
        slug,
        provider: payload.provider,
        trackingUrlTemplate: payload.trackingUrlTemplate,
        website: payload.website,
        phone: payload.phone,
        email: payload.email,
        logo: logo || null,
        notes: payload.notes,
        apiSettings: nextApiSettings(payload, null),
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateShippingAdmin();
    return { success: true, message: "Kargo firması oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Kargo firması oluşturulurken bir hata oluştu." };
  }
}

export async function updateShippingCarrierAction(
  _prev: ShippingCarrierFormState,
  formData: FormData,
): Promise<ShippingCarrierFormState> {
  const gate = await requirePermission("shipping", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kargo firması bulunamadı." };

  const existing = await prisma.shippingCarrier.findUnique({ where: { id } });
  if (!existing) return { error: "Kargo firması bulunamadı." };

  const payload = parseCarrierPayload(formData);
  const fieldErrors = validatePayload(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Formdaki hataları düzeltin.", fieldErrors };
  }

  try {
    const slug = await uniqueCarrierSlug(payload.slugInput || payload.name, id);
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    let logo = payload.existingLogo;
    if (payload.logoFile instanceof File && payload.logoFile.size > 0) {
      logo = await saveLogo(payload.logoFile, payload.existingLogo, existing.logo);
    } else if (!logo && existing.logo) {
      await deletePublicAsset(existing.logo);
      logo = "";
    }

    await prisma.shippingCarrier.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        provider: payload.provider,
        trackingUrlTemplate: payload.trackingUrlTemplate,
        website: payload.website,
        phone: payload.phone,
        email: payload.email,
        logo: logo || null,
        notes: payload.notes,
        apiSettings: nextApiSettings(payload, existing.apiSettings),
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateShippingAdmin(id);
    return { success: true, message: "Kargo firması güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Kargo firması güncellenirken bir hata oluştu." };
  }
}

export async function deleteShippingCarrierAction(input: {
  id: string;
}): Promise<DeleteShippingCarrierResult> {
  const gate = await requirePermission("shipping", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kargo firması bulunamadı." };

  const existing = await prisma.shippingCarrier.findUnique({ where: { id } });
  if (!existing) return { error: "Kargo firması bulunamadı." };

  try {
    await prisma.shippingCarrier.delete({ where: { id } });
    if (existing.logo) await deletePublicAsset(existing.logo);

    revalidateShippingAdmin();
    return { success: true, message: "Kargo firması silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Kargo firması silinirken bir hata oluştu." };
  }
}

export async function toggleShippingCarrierActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<DeleteShippingCarrierResult> {
  const gate = await requirePermission("shipping", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kargo firması bulunamadı." };

  const existing = await prisma.shippingCarrier.findUnique({ where: { id } });
  if (!existing) return { error: "Kargo firması bulunamadı." };

  await prisma.shippingCarrier.update({
    where: { id },
    data: { isActive: input.isActive },
  });

  revalidateShippingAdmin(id);
  return {
    success: true,
    message: input.isActive ? "Kargo firması aktif edildi." : "Kargo firması pasife alındı.",
  };
}

export async function testArasConnectionAction(input: {
  carrierId?: string;
  username?: string;
  password?: string;
  customerCode?: string;
  environment?: string;
}): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const gate = await requirePermission("shipping", "update");
  if (!gate.ok) return { error: gate.error };

  let username = String(input.username ?? "").trim();
  let password = String(input.password ?? "");
  let customerCode = String(input.customerCode ?? "").trim();
  let environment = parseArasEnvironment(String(input.environment ?? "test"));

  const carrierId = String(input.carrierId ?? "").trim();
  if (carrierId && (!username || !password || !customerCode)) {
    const carrier = await prisma.shippingCarrier.findUnique({
      where: { id: carrierId },
      select: { apiSettings: true, provider: true },
    });
    if (!carrier || carrier.provider !== ShippingCarrierProvider.ARAS) {
      return { error: "Aras Kargo kaydı bulunamadı." };
    }
    const stored = parseArasApiSettings(carrier.apiSettings);
    username = username || stored?.username || "";
    password = password || stored?.password || "";
    customerCode = customerCode || stored?.customerCode || "";
    if (!input.environment && stored) environment = stored.environment;
  }

  const result = await testArasConnection({ username, password, environment, customerCode });
  if (!result.ok) return { error: result.error };
  return { ok: true, message: result.message };
}

export async function testYurticiConnectionAction(input: {
  carrierId?: string;
  username?: string;
  password?: string;
  environment?: string;
  language?: string;
}): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const gate = await requirePermission("shipping", "update");
  if (!gate.ok) return { error: gate.error };

  let username = String(input.username ?? "").trim();
  let password = String(input.password ?? "");
  let environment = parseYurticiEnvironment(String(input.environment ?? "test"));
  let language = parseYurticiLanguage(String(input.language ?? "TR"));

  const carrierId = String(input.carrierId ?? "").trim();
  if (carrierId && (!username || !password)) {
    const carrier = await prisma.shippingCarrier.findUnique({
      where: { id: carrierId },
      select: { apiSettings: true, provider: true },
    });
    if (!carrier || carrier.provider !== ShippingCarrierProvider.YURTICI) {
      return { error: "Yurtiçi Kargo kaydı bulunamadı." };
    }
    const stored = parseYurticiApiSettings(carrier.apiSettings);
    username = username || stored?.username || "";
    password = password || stored?.password || "";
    if (!input.environment && stored) environment = stored.environment;
    if (!input.language && stored) language = stored.language;
  }

  const result = await testYurticiConnection({ username, password, environment, language });
  if (!result.ok) return { error: result.error };
  return { ok: true, message: result.message };
}
