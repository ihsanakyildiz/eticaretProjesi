import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Alış faturası" };

export default function PurchaseInvoicesPage() {
  return (
    <StockDocumentKindList
      kind="PURCHASE_INVOICE"
      description="Tedarikçi faturası. İrsaliyeden kesilirse stok tekrar hareket etmez; bağımsız kesilirse mal kabul gibi stoğa işler."
    />
  );
}
