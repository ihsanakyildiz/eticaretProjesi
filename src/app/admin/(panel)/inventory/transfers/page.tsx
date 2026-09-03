import type { Metadata } from "next";
import { StockDocumentKindList } from "../documents/document-kind-list";

export const metadata: Metadata = { title: "Depo transferi" };

export default function TransfersPage() {
  return (
    <StockDocumentKindList
      kind="TRANSFER"
      description="İstanbul’dan İzmir’e gibi depolar arası nakil. Kaynak depodan çıkar, hedef depoya girer."
    />
  );
}
