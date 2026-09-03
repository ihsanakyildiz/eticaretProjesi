import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Sayım" };

export default function CountsPage() {
  return (
    <StockDocumentKindList
      kind="COUNT"
      description="El terminali ile raftaki adedi okutun. Onayda depo bakiyesi sayılan miktara çekilir, fark hareket olarak yazılır."
    />
  );
}
