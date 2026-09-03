"use client";

export function PaytrCheckoutFrame({ token }: { token: string }) {
  return (
    <iframe
      title="PayTR ödeme formu"
      src={`https://www.paytr.com/odeme/guvenli/${token}`}
      className="min-h-[760px] w-full rounded-lg border border-site-border bg-white"
    />
  );
}
