import { redirect } from "next/navigation";

export default function SearchTermsRedirectPage() {
  redirect("/admin/settings/search");
}
