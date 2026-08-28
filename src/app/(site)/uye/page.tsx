import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureMemberPortalAccess } from "./actions";
import { MemberProfileForms } from "./profile-forms";

export const metadata: Metadata = {
  title: "Profilim",
};

export default async function UyePage() {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect(access.reason === "disabled" ? "/" : "/giris?callbackUrl=/uye");
  }

  const user = await prisma.user.findUnique({
    where: { id: access.session.user.id },
  });
  if (!user) redirect("/giris");

  return (
    <MemberProfileForms
      name={user.name ?? ""}
      email={user.email}
      phone={user.phone ?? ""}
      image={user.image ?? ""}
      hasPassword={Boolean(user.password)}
    />
  );
}
