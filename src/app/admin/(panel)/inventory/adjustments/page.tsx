import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Stok düzeltme" };

export default function AdjustmentsPage() {
  return (
    <StockDocumentKindList
      kind="ADJUSTMENT"
      description="Fire, fazla, sayım dışı düzeltme. Pozitif adet giriş, negatif adet çıkıştır."
    />
  );
}
