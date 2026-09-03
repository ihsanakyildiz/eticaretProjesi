import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderEvaluateForm, type ProductReviewTab } from "@/components/site/reviews/order-evaluate-form";
import { parseOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { canReviewOrder, canReviewShipment } from "@/lib/reviews";
import { ensureMemberPortalAccess } from "../../../actions";

type PageProps = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Sipariş ${reference} değerlendir` };
}

export default async function MemberOrderReviewPage({ params, searchParams }: PageProps) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye/siparisler");
  }

  const { reference } = await params;
  const { tab } = await searchParams;

  function parseTab(value: string | undefined): ProductReviewTab | undefined {
    switch (value) {
      case "evaluate":
      case "approved":
      case "rejected":
        return value;
      default:
        return undefined;
    }
  }
  const order = await prisma.order.findFirst({
    where: { reference, userId: access.session.user.id },
    include: {
      items: true,
      feedbacks: true,
    },
  });
  if (!order) notFound();

  const status = parseOrderStatus(order.status);
  const [deliveredItems, reviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        order: { userId: access.session.user.id, status: "DELIVERED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, title: true, image: true, brand: { select: { name: true } } } },
      },
    }),
    prisma.productReview.findMany({
      where: { userId: access.session.user.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const reviewByProduct = new Map(reviews.map((row) => [row.productId, row]));
  const seen = new Set<string>();
  const products = deliveredItems.flatMap((item) => {
    if (!item.productId || seen.has(item.productId)) return [];
    seen.add(item.productId);
    const review = reviewByProduct.get(item.productId) ?? null;
    return [
      {
        orderItemId: item.id,
        productId: item.productId,
        title: item.product?.title || item.title,
        brandName: item.product?.brand?.name ?? null,
        image: item.image || item.product?.image || null,
        fromCurrentOrder: item.orderId === order.id,
        review: review
          ? {
              rating: review.rating,
              comment: review.comment ?? "",
              displayName: review.displayName,
              status: review.status,
              photos: review.images.map((image) => image.url),
            }
          : null,
      },
    ];
  });
  products.sort((a, b) => Number(b.fromCurrentOrder) - Number(a.fromCurrentOrder));

  const orderFeedback = order.feedbacks.find((row) => row.kind === "ORDER");
  const shipmentFeedback = order.feedbacks.find((row) => row.kind === "SHIPMENT");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/uye/siparisler" className="text-sm font-medium text-site-primary hover:underline">
          ← Siparişlerim
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-site-fg">Sipariş #{order.reference} değerlendir</h2>
        <p className="mt-1 text-sm text-site-muted">
          Sipariş ve kargoyu ayrı puanlayın. Ürün yorumlarına fotoğraf ekleyebilirsiniz; yorumlar
          onaylandıktan sonra yayınlanır.
        </p>
      </div>
      <OrderEvaluateForm
        reference={order.reference}
        orderRating={orderFeedback?.rating ?? 0}
        orderComment={orderFeedback?.comment ?? ""}
        shipmentRating={shipmentFeedback?.rating ?? 0}
        shipmentComment={shipmentFeedback?.comment ?? ""}
        canRateOrder={canReviewOrder(status)}
        canRateShipment={canReviewShipment(status)}
        products={products}
      initialTab={parseTab(tab)}
      />
    </div>
  );
}
