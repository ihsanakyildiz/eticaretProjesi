import Link from "next/link";

export function DuplicateBarcodeAlert({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="font-semibold">
        {count.toLocaleString("tr-TR")} barkod birden fazla varyantta kullanılıyor.
      </p>
      <p className="mt-1">
        Aynı barkod ikinci bir üründe olamaz. Depo paketlemesi için bu kayıtları düzeltin.{" "}
        <Link href="/admin/products/duplicate-barcodes" className="font-semibold underline">
          Tekrarlayan barkodları gör
        </Link>
      </p>
    </div>
  );
}
