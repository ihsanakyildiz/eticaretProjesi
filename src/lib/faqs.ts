import { prisma } from "@/lib/prisma";

export async function getFaqGroupBySlug(slug: string) {
  return prisma.faqGroup.findFirst({
    where: { slug, isActive: true },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}
