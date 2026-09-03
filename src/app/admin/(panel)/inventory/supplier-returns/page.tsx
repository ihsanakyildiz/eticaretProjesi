import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Tedarikçi iadesi" };

export default function SupplierReturnsPage() {
  return (
    <StockDocumentKindList
      kind="SUPPLIER_RETURN"
      description="Tedarikçiye mal iadesi. Onayda seçilen depodan stok çıkar."
    />
  );
}
