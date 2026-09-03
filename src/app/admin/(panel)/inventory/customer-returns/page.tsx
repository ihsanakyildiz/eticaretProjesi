import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Müşteri iadesi" };

export default function CustomerReturnsPage() {
  return (
    <StockDocumentKindList
      kind="CUSTOMER_RETURN"
      description="Satış iadesinin depoya kabulü. Sipariş iade akışından bağımsız manuel giriş için kullanın."
    />
  );
}
