import { redirect } from "next/navigation";

type EditFaqItemPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

/** Soru düzenleme artık grup düzenleme sayfasındaki modal ile yapılır. */
export default async function EditFaqItemPage({ params }: EditFaqItemPageProps) {
  const { id } = await params;
  redirect(`/admin/faqs/${id}/edit`);
}
