import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Giriş irsaliyesi" };

export default function GoodsReceiptsPage() {
  return (
    <StockDocumentKindList
      kind="GOODS_RECEIPT"
      description="Tedarikçiden mal kabul. El terminali ile barkod okutun, onaylayınca seçilen depoya stok girer. Onaylı irsaliyeden alış faturası kesebilirsiniz."
    />
  );
}
