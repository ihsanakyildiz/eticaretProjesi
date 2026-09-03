import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdvancedInventoryEnabled } from "@/lib/advanced-inventory";
import { InventorySubnav } from "./inventory-subnav";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  if (!(await isAdvancedInventoryEnabled())) {
    redirect("/admin/products");
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <InventorySubnav />
      </div>
      {children}
    </div>
  );
}
