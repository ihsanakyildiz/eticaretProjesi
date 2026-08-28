import { redirect } from "next/navigation";

type NewFaqItemPageProps = {
  params: Promise<{ id: string }>;
};

/** Soru ekleme artık grup düzenleme sayfasındaki modal ile yapılır. */
export default async function NewFaqItemPage({ params }: NewFaqItemPageProps) {
  const { id } = await params;
  redirect(`/admin/faqs/${id}/edit`);
}
