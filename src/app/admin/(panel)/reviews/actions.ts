"use server";

import { revalidatePath } from "next/cache";
import { catalogProductHref } from "@/lib/catalog-storefront";
import { prisma } from "@/lib/prisma";
import { type ReviewStatusCode } from "@/lib/reviews";
import { requirePermission } from "@/lib/staff-permissions";
import { parseUrlStructure } from "@/lib/url-structure";
import { getSettingsMap } from "@/lib/settings";

export type ReviewModerationState = {
  error?: string;
  success?: boolean;
  message?: string;
};

function parseModerationStatus(value: ReviewStatusCode): ReviewStatusCode | null {
  switch (value) {
    case "APPROVED":
    case "REJECTED":
    case "PENDING":
      return value;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function moderationMessage(status: ReviewStatusCode): string {
  switch (status) {
    case "APPROVED":
      return "Yorum yayınlandı.";
    case "REJECTED":
      return "Yorum reddedildi.";
    case "PENDING":
      return "Yorum yayından kaldırıldı.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export async function moderateProductReviewAction(
  nextStatus: ReviewStatusCode,
  _prev: ReviewModerationState,
  formData: FormData,
): Promise<ReviewModerationState> {
  const gate = await requirePermission("reviews", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  const status = parseModerationStatus(nextStatus);
  const moderatorNote = String(formData.get("moderatorNote") ?? "").trim().slice(0, 500);
  if (!id || !status) return { error: "Geçersiz işlem." };

  const review = await prisma.productReview.findUnique({
    where: { id },
    include: {
      product: { select: { slug: true, urlId: true } },
      order: { select: { reference: true } },
    },
  });
  if (!review) return { error: "Yorum bulunamadı." };

  await prisma.productReview.update({
    where: { id },
    data: {
      status,
      moderatedAt: new Date(),
      moderatorNote: moderatorNote || null,
    },
  });

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const urls = parseUrlStructure(settings);
  revalidatePath("/admin/reviews");
  revalidatePath(catalogProductHref(review.product.slug, urls, review.product.urlId));
  revalidatePath(`/uye/siparisler/${review.order.reference}/degerlendir`);
  return {
    success: true,
    message: moderationMessage(status),
  };
}
