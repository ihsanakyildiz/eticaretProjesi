"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { moderateProductReviewAction, type ReviewModerationState } from "./actions";
import { formatReviewDate, reviewStatusLabel, type ReviewStatusCode } from "@/lib/reviews";

export type AdminReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  displayName: boolean;
  status: ReviewStatusCode;
  createdAt: string;
  productTitle: string;
  productHref: string | null;
  customerName: string;
  customerEmail: string;
  orderReference: string;
  photos: string[];
};

const initialState: ReviewModerationState = {};

const approveReviewAction = moderateProductReviewAction.bind(null, "APPROVED");
const rejectReviewAction = moderateProductReviewAction.bind(null, "REJECTED");
const unpublishReviewAction = moderateProductReviewAction.bind(null, "PENDING");

function ReviewRowActions({ id, status }: { id: string; status: ReviewStatusCode }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveReviewAction,
    initialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectReviewAction,
    initialState,
  );
  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishReviewAction,
    initialState,
  );
  const pending = approvePending || rejectPending || unpublishPending;
  const error = approveState.error || rejectState.error || unpublishState.error;
  const success = approveState.success || rejectState.success || unpublishState.success;
  const message = approveState.message || rejectState.message || unpublishState.message;

  let buttons: ReactNode;
  switch (status) {
    case "PENDING":
      buttons = (
        <>
          <form action={approveAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-[#0ab39c] px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              Onayla
            </button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-rose-500 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              Reddet
            </button>
          </form>
        </>
      );
      break;
    case "APPROVED":
      buttons = (
        <form action={unpublishAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
          >
            Yayından kaldır
          </button>
        </form>
      );
      break;
    case "REJECTED":
      buttons = (
        <form action={approveAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[#0ab39c] px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            Onayla
          </button>
        </form>
      );
      break;
    default: {
      const _exhaustive: never = status;
      buttons = _exhaustive;
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">{buttons}</div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{message}</p> : null}
    </div>
  );
}

export function ReviewsTable({ rows }: { rows: AdminReviewRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Bu filtrede yorum yok.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[#e9ebec] bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#f3f6f9] text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Ürün</th>
            <th className="px-4 py-3 font-semibold">Müşteri</th>
            <th className="px-4 py-3 font-semibold">Puan / yorum</th>
            <th className="px-4 py-3 font-semibold">Durum</th>
            <th className="px-4 py-3 font-semibold text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e9ebec]">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-3">
                {row.productHref ? (
                  <Link href={row.productHref} className="font-medium text-[#405189] hover:underline" target="_blank">
                    {row.productTitle}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-800">{row.productTitle}</span>
                )}
                <p className="mt-1 text-xs text-slate-500">Sipariş #{row.orderReference}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-slate-800">{row.customerName}</p>
                <p className="text-xs text-slate-500">{row.customerEmail}</p>
                <p className="mt-1 text-xs text-slate-400">{formatReviewDate(row.createdAt)}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{row.rating}/5</p>
                <p className="mt-1 max-w-md whitespace-pre-wrap text-slate-600">{row.comment}</p>
                {row.photos.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.photos.map((src) => (
                      <a
                        key={src}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block h-14 w-14 overflow-hidden rounded border border-[#e9ebec]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {!row.displayName ? (
                  <p className="mt-1 text-xs text-slate-400">İsim gizlenecek</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs font-medium">{reviewStatusLabel(row.status)}</td>
              <td className="px-4 py-3 text-right">
                <ReviewRowActions id={row.id} status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
