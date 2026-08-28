import { headers } from "next/headers";

export async function isAdminRequest() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  return pathname.startsWith("/admin");
}
