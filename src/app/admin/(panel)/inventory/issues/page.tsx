import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Çıkış irsaliyesi" };

export default function GoodsIssuesPage() {
  return (
    <StockDocumentKindList
      kind="GOODS_ISSUE"
      description="Depodan manuel çıkış (numune, fire, sipariş dışı sevk). Onayda seçilen depodan stok düşer."
    />
  );
}
