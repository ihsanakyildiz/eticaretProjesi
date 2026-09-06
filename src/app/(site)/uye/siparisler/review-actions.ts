"use server";

import { revalidatePath } from "next/cache";
import { ensureMemberPortalAccess } from "../actions";
import { parseOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  canReviewOrder,
  canReviewShipment,
  ORDER_FEEDBACK_MAX_LENGTH,
  parseStarRating,
  PRODUCT_REVIEW_MAX_LENGTH,
  PRODUCT_REVIEW_MAX_PHOTOS,
  PRODUCT_REVIEW_PHOTO_MAX_EDGE,
  PRODUCT_REVIEW_PHOTO_MAX_UPLOAD_BYTES,
  type OrderFeedbackKindCode,
} from "@/lib/reviews";
import { deletePublicAsset, saveOptimizedImage } from "@/lib/uploads";

export type ReviewFormState = {
  error?: string;
  success?: boolean;
  message?: string;
};

async function loadOwnedOrder(userId: string, reference: string) {
  return prisma.order.findFirst({
    where: { reference, userId },
    select: {
      id: true,
      reference: true,
      status: true,
    },
  });
}

export async function submitOrderFeedbackAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) return { error: "Oturum bulunamadı." };

  const reference = String(formData.get("reference") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const rating = parseStarRating(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, ORDER_FEEDBACK_MAX_LENGTH);
  const kind: OrderFeedbackKindCode | null =
    kindRaw === "ORDER" || kindRaw === "SHIPMENT" ? kindRaw : null;

  if (!reference || !kind) return { error: "Eksik bilgi." };
  if (!rating) return { error: "Lütfen 1 ile 5 arasında puan verin." };

  const order = await loadOwnedOrder(access.session.user.id, reference);
  if (!order) return { error: "Sipariş bulunamadı." };
  const status = parseOrderStatus(order.status);
  if (kind === "ORDER" && !canReviewOrder(status)) {
    return { error: "Sipariş teslim edildikten sonra değerlendirilebilir." };
  }
  if (kind === "SHIPMENT" && !canReviewShipment(status)) {
    return { error: "Kargo yola çıktıktan sonra değerlendirilebilir." };
  }

  await prisma.orderFeedback.upsert({
    where: { orderId_kind: { orderId: order.id, kind } },
    create: {
      orderId: order.id,
      userId: access.session.user.id,
      kind,
      rating,
      comment: comment || null,
    },
    update: {
      rating,
      comment: comment || null,
    },
  });

  revalidatePath("/uye/siparisler");
  revalidatePath(`/uye/siparisler/${order.reference}`);
  revalidatePath(`/uye/siparisler/${order.reference}/degerlendir`);
  return {
    success: true,
    message: kind === "ORDER" ? "Sipariş değerlendirmeniz kaydedildi." : "Kargo değerlendirmeniz kaydedildi.",
  };
}

export async function submitProductReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) return { error: "Oturum bulunamadı." };

  const reference = String(formData.get("reference") ?? "").trim();
  const orderItemId = String(formData.get("orderItemId") ?? "").trim();
  const rating = parseStarRating(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, PRODUCT_REVIEW_MAX_LENGTH);
  const displayName = formData.get("displayName") === "on";

  if (!orderItemId) return { error: "Ürün bulunamadı." };
  if (!rating) return { error: "Lütfen 1 ile 5 arasında puan verin." };
  if (!comment) return { error: "Lütfen bir yorum yazın." };

  const purchased = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      productId: { not: null },
      order: {
        userId: access.session.user.id,
        status: "DELIVERED",
      },
    },
    select: {
      id: true,
      productId: true,
      orderId: true,
      order: { select: { reference: true } },
    },
  });
  const productId = purchased?.productId;
  const userId = access.session.user.id;
  if (!purchased || !productId || !userId) {
    return { error: "Yalnızca teslim edilen siparişlerdeki ürünler değerlendirilebilir." };
  }

  const existing = await prisma.productReview.findUnique({
    where: { userId_productId: { userId, productId } },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing?.status === "APPROVED") {
    return { error: "Bu ürüne verdiğiniz yorum yayında. Değiştirilemez." };
  }

  const keepRequested = formData.getAll("keepImage").map((value) => String(value).trim()).filter(Boolean);
  const ownedUrls = new Set((existing?.images ?? []).map((image) => image.url));
  const keepUrls = keepRequested.filter((url) => ownedUrls.has(url));
  const incoming = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (keepUrls.length + incoming.length > PRODUCT_REVIEW_MAX_PHOTOS) {
    return { error: `En fazla ${PRODUCT_REVIEW_MAX_PHOTOS} fotoğraf ekleyebilirsiniz.` };
  }

  const savedPaths: string[] = [];
  try {
    for (const file of incoming) {
      const saved = await saveOptimizedImage(file, {
        uploadDir: "uploads/reviews",
        width: PRODUCT_REVIEW_PHOTO_MAX_EDGE,
        height: PRODUCT_REVIEW_PHOTO_MAX_EDGE,
        fit: "inside",
        quality: 72,
        effort: 4,
        maxBytes: PRODUCT_REVIEW_PHOTO_MAX_UPLOAD_BYTES,
        allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"],
      });
      savedPaths.push(saved.publicPath);
    }
  } catch (cause) {
    await Promise.all(savedPaths.map((path) => deletePublicAsset(path)));
    return {
      error: cause instanceof Error ? cause.message : "Görseller yüklenemedi.",
    };
  }

  const imageUrls = [...keepUrls, ...savedPaths];

  try {
    await prisma.$transaction(async (tx) => {
      const review = await tx.productReview.upsert({
        where: { userId_productId: { userId, productId } },
        create: {
          productId,
          orderId: purchased.orderId,
          orderItemId: purchased.id,
          userId,
          rating,
          comment,
          displayName,
          status: "PENDING",
        },
        update: {
          orderId: purchased.orderId,
          orderItemId: purchased.id,
          rating,
          comment,
          displayName,
          status: "PENDING",
          moderatedAt: null,
          moderatorNote: null,
        },
      });
      await tx.productReviewImage.deleteMany({ where: { reviewId: review.id } });
      if (imageUrls.length > 0) {
        await tx.productReviewImage.createMany({
          data: imageUrls.map((url, sortOrder) => ({
            reviewId: review.id,
            url,
            sortOrder,
          })),
        });
      }
    });
    const removed = (existing?.images ?? []).filter((image) => !keepUrls.includes(image.url));
    await Promise.all(removed.map((image) => deletePublicAsset(image.url)));
  } catch (cause) {
    await Promise.all(savedPaths.map((path) => deletePublicAsset(path)));
    return {
      error: cause instanceof Error ? cause.message : "Yorum kaydedilemedi.",
    };
  }

  revalidatePath("/uye/siparisler");
  if (reference) revalidatePath(`/uye/siparisler/${reference}/degerlendir`);
  revalidatePath(`/uye/siparisler/${purchased.order.reference}/degerlendir`);
  return { success: true, message: "Yorumunuz incelemeye alındı. Onaylandıktan sonra üründe yayınlanır." };
}
