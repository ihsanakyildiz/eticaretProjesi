import type { OrderStatus } from "@prisma/client";

export type ReviewStatusCode = "PENDING" | "APPROVED" | "REJECTED";
export type OrderFeedbackKindCode = "ORDER" | "SHIPMENT";

export const PRODUCT_REVIEW_MAX_LENGTH = 2000;
export const ORDER_FEEDBACK_MAX_LENGTH = 500;
export const PRODUCT_REVIEW_MAX_PHOTOS = 4;
export const PRODUCT_REVIEW_PHOTO_MAX_EDGE = 1280;
export const PRODUCT_REVIEW_PHOTO_QUALITY = 0.72;
export const PRODUCT_REVIEW_PHOTO_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const PRODUCT_REVIEW_PHOTO_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type ReviewableOrderStatus = Extract<OrderStatus, "SHIPPED" | "DELIVERED">;

export function canReviewOrder(status: OrderStatus): boolean {
  return status === "DELIVERED";
}

export function canReviewShipment(status: OrderStatus): boolean {
  return status === "SHIPPED" || status === "DELIVERED";
}

export function canReviewProducts(status: OrderStatus): boolean {
  return status === "DELIVERED";
}

export function canOpenOrderReviews(status: OrderStatus): boolean {
  return canReviewOrder(status) || canReviewShipment(status) || canReviewProducts(status);
}

export function parseStarRating(value: unknown): number | null {
  const rating = Math.floor(Number(value));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

export function reviewStatusLabel(status: ReviewStatusCode): string {
  switch (status) {
    case "PENDING":
      return "Onay bekliyor";
    case "APPROVED":
      return "Yayında";
    case "REJECTED":
      return "Reddedildi";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function reviewerDisplayName(input: {
  displayName: boolean;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
}): string {
  if (!input.displayName) return "Müşteri";
  const first = input.firstName?.trim();
  const last = input.lastName?.trim();
  if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
  if (first) return first;
  const full = input.name?.trim();
  if (!full) return "Müşteri";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export function formatReviewDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
