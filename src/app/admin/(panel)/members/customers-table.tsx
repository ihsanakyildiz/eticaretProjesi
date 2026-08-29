"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  CUSTOMER_GROUPS,
  CUSTOMER_TITLES,
  customerGroupLabel,
  customerTitleLabel,
  dateOnly,
  formatCustomerDateTime,
  type CustomerBulkAction,
  type CustomerFlagField,
  type CustomerGroupCode,
  type CustomerTitleCode,
} from "@/lib/customers";
import { Can, useCan } from "@/components/admin/admin-permissions";
import {
  bulkCustomersAction,
  deleteCustomerAction,
  patchCustomerFlagAction,
} from "./actions";

export type CustomerRow = {
  id: string;
  customerNo: number;
  title: CustomerTitleCode;
  firstName: string;
  lastName: string;
  email: string;
  customerGroup: CustomerGroupCode;
  addressCount: number;
  isActive: boolean;
  newsletter: boolean;
  partnerOffers: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

const filterInputClass =
  "w-full min-w-[5.5rem] rounded border border-[#ced4da] bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-[#0ab39c]";

const filterSelectClass = `${filterInputClass} appearance-none`;

function CompactToggle({
  on,
  disabled,
  label,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-[#0ab39c]" : "bg-[#ced4da]"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function DeleteModal({
  title,
  description,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        disabled={isPending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] px-4 py-2 text-sm font-medium text-slate-600"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

type Filters = {
  customerNo: string;
  title: "all" | CustomerTitleCode;
  firstName: string;
  lastName: string;
  email: string;
  group: "all" | CustomerGroupCode;
  isActive: "all" | "on" | "off";
  newsletter: "all" | "on" | "off";
  partnerOffers: "all" | "on" | "off";
  registeredFrom: string;
  registeredTo: string;
};

const emptyFilters: Filters = {
  customerNo: "",
  title: "all",
  firstName: "",
  lastName: "",
  email: "",
  group: "all",
  isActive: "all",
  newsletter: "all",
  partnerOffers: "all",
  registeredFrom: "",
  registeredTo: "",
};

function matchesFlag(filter: "all" | "on" | "off", value: boolean) {
  if (filter === "all") return true;
  return filter === "on" ? value : !value;
}

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const canUpdate = useCan("customers", "update");
  const canDelete = useCan("customers", "delete");
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<CustomerBulkAction | "">("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuId(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuId]);

  const filtered = useMemo(() => {
    return customers.filter((customer) => {
      if (applied.customerNo && !String(customer.customerNo).includes(applied.customerNo.trim())) {
        return false;
      }
      if (applied.title !== "all" && customer.title !== applied.title) return false;
      if (
        applied.firstName &&
        !customer.firstName.toLocaleLowerCase("tr-TR").includes(applied.firstName.toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }
      if (
        applied.lastName &&
        !customer.lastName.toLocaleLowerCase("tr-TR").includes(applied.lastName.toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }
      if (
        applied.email &&
        !customer.email.toLocaleLowerCase("tr-TR").includes(applied.email.toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }
      if (applied.group !== "all" && customer.customerGroup !== applied.group) return false;
      if (!matchesFlag(applied.isActive, customer.isActive)) return false;
      if (!matchesFlag(applied.newsletter, customer.newsletter)) return false;
      if (!matchesFlag(applied.partnerOffers, customer.partnerOffers)) return false;
      const created = dateOnly(customer.createdAt);
      if (applied.registeredFrom && created < applied.registeredFrom) return false;
      if (applied.registeredTo && created > applied.registeredTo) return false;
      return true;
    });
  }, [customers, applied]);

  const visibleIds = filtered.map((customer) => customer.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const patchFlag = (customer: CustomerRow, field: CustomerFlagField, value: boolean) => {
    startTransition(async () => {
      const result = await patchCustomerFlagAction({ id: customer.id, field, value });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  };

  const runBulk = (action: CustomerBulkAction, ids: string[]) => {
    startTransition(async () => {
      const result = await bulkCustomersAction({ ids, action });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setSelected([]);
      setBulkAction("");
      setBulkDeleteOpen(false);
      setActionError(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCustomerAction({ id: deleteTarget.id });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const applyBulk = () => {
    if (!bulkAction || selected.length === 0) return;
    if (bulkAction === "delete") {
      setBulkDeleteOpen(true);
      return;
    }
    runBulk(bulkAction, selected);
  };

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-4 py-3">
          {canUpdate || canDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as CustomerBulkAction | "")}
                className="rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
              >
                <option value="">Toplu Eylemler</option>
                {canUpdate ? (
                  <>
                    <option value="enable">Etkinleştir</option>
                    <option value="disable">Pasifleştir</option>
                    <option value="newsletterOn">Bültene abone et</option>
                    <option value="newsletterOff">Bülten aboneliğini kaldır</option>
                  </>
                ) : null}
                {canDelete ? <option value="delete">Seçilenleri sil</option> : null}
              </select>
              <button
                type="button"
                onClick={applyBulk}
                disabled={isPending || !bulkAction || selected.length === 0}
                className="rounded-md bg-[#0ab39c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
              >
                Uygula
              </button>
              {selected.length > 0 ? (
                <span className="text-xs text-slate-500">{selected.length} seçili</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {actionError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e9ebec] bg-[#f3f6f9] text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => {
                      setSelected((current) => {
                        if (event.target.checked) {
                          return Array.from(new Set([...current, ...visibleIds]));
                        }
                        return current.filter((id) => !visibleIds.includes(id));
                      });
                    }}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="px-2 py-2">Kimlik</th>
                <th className="px-2 py-2">Sosyal unvan</th>
                <th className="px-2 py-2">Ad</th>
                <th className="px-2 py-2">Soyad</th>
                <th className="px-2 py-2">E-posta adresi</th>
                <th className="px-2 py-2">Grup</th>
                <th className="px-2 py-2">Adresler</th>
                <th className="px-2 py-2">Satışlar</th>
                <th className="px-2 py-2">Etkin</th>
                <th className="px-2 py-2">Haber Bülteni</th>
                <th className="px-2 py-2">Ortakların teklifleri</th>
                <th className="px-2 py-2">Kayıt</th>
                <th className="px-2 py-2">Son ziyaret</th>
                <th className="px-2 py-2 text-right">Eylemler</th>
              </tr>
              <tr className="border-b border-[#e9ebec] bg-[#f8f9fa]">
                <td className="px-3 py-1.5" />
                <td className="px-2 py-1.5">
                  <input
                    value={draft.customerNo}
                    onChange={(event) => setDraft((current) => ({ ...current, customerNo: event.target.value }))}
                    placeholder="ID ara"
                    className={filterInputClass}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value as Filters["title"],
                      }))
                    }
                    className={filterSelectClass}
                    aria-label="Unvan filtresi"
                  >
                    <option value="all">Hepsi</option>
                    {CUSTOMER_TITLES.map((title) => (
                      <option key={title} value={title}>
                        {customerTitleLabel(title)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={draft.firstName}
                    onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
                    placeholder="Ad ara"
                    className={filterInputClass}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={draft.lastName}
                    onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
                    placeholder="Soyad ara"
                    className={filterInputClass}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Eposta ara"
                    className={filterInputClass}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={draft.group}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        group: event.target.value as Filters["group"],
                      }))
                    }
                    className={filterSelectClass}
                    aria-label="Grup filtresi"
                  >
                    <option value="all">Hepsi</option>
                    {CUSTOMER_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {customerGroupLabel(group)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5">
                  <select
                    value={draft.isActive}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        isActive: event.target.value as Filters["isActive"],
                      }))
                    }
                    className={filterSelectClass}
                    aria-label="Etkin filtresi"
                  >
                    <option value="all">Hepsi</option>
                    <option value="on">Evet</option>
                    <option value="off">Hayır</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={draft.newsletter}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        newsletter: event.target.value as Filters["newsletter"],
                      }))
                    }
                    className={filterSelectClass}
                    aria-label="Bülten filtresi"
                  >
                    <option value="all">Hepsi</option>
                    <option value="on">Evet</option>
                    <option value="off">Hayır</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={draft.partnerOffers}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        partnerOffers: event.target.value as Filters["partnerOffers"],
                      }))
                    }
                    className={filterSelectClass}
                    aria-label="Ortak teklifleri filtresi"
                  >
                    <option value="all">Hepsi</option>
                    <option value="on">Evet</option>
                    <option value="off">Hayır</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex min-w-[11rem] gap-1">
                    <input
                      type="date"
                      value={draft.registeredFrom}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, registeredFrom: event.target.value }))
                      }
                      className={filterInputClass}
                      aria-label="Kayıt başlangıç"
                    />
                    <input
                      type="date"
                      value={draft.registeredTo}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, registeredTo: event.target.value }))
                      }
                      className={filterInputClass}
                      aria-label="Kayıt bitiş"
                    />
                  </div>
                </td>
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => setApplied(draft)}
                    className="inline-flex items-center gap-1 rounded border border-[#ced4da] bg-[#e9ebec] px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-[#dee2e6]"
                  >
                    <Search className="h-3 w-3" />
                    Ara
                  </button>
                </td>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-sm text-slate-500">
                    {customers.length === 0 ? "Henüz müşteri yok." : "Aramanızla eşleşen müşteri yok."}
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-[#e9ebec] last:border-0 hover:bg-[#f8f9fa]">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(customer.id)}
                        onChange={(event) => {
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, customer.id]
                              : current.filter((id) => id !== customer.id),
                          );
                        }}
                        aria-label={`${customer.firstName} ${customer.lastName} seç`}
                      />
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-slate-700">{customer.customerNo}</td>
                    <td className="px-2 py-2.5 text-slate-700">{customerTitleLabel(customer.title)}</td>
                    <td className="px-2 py-2.5 font-medium text-slate-800">{customer.firstName || "—"}</td>
                    <td className="px-2 py-2.5 text-slate-800">{customer.lastName || "—"}</td>
                    <td className="px-2 py-2.5 text-slate-600">{customer.email}</td>
                    <td className="px-2 py-2.5 text-slate-700">{customerGroupLabel(customer.customerGroup)}</td>
                    <td className="px-2 py-2.5 tabular-nums text-slate-600">{customer.addressCount}</td>
                    <td className="px-2 py-2.5 text-slate-400">—</td>
                    <td className="px-2 py-2.5">
                      <CompactToggle
                        on={customer.isActive}
                        disabled={isPending || !canUpdate}
                        label="Etkin"
                        onClick={() => patchFlag(customer, "isActive", !customer.isActive)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <CompactToggle
                        on={customer.newsletter}
                        disabled={isPending || !canUpdate}
                        label="Haber bülteni"
                        onClick={() => patchFlag(customer, "newsletter", !customer.newsletter)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <CompactToggle
                        on={customer.partnerOffers}
                        disabled={isPending || !canUpdate}
                        label="Ortak teklifleri"
                        onClick={() => patchFlag(customer, "partnerOffers", !customer.partnerOffers)}
                      />
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-slate-600">
                      {formatCustomerDateTime(customer.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-slate-600">
                      {formatCustomerDateTime(customer.lastLoginAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="relative flex items-center justify-end gap-1" ref={menuId === customer.id ? menuRef : undefined}>
                        <Can resource="customers" action="update">
                          <Link
                            href={`/admin/members/${customer.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189]"
                            title="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Can>
                        {canDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setMenuId((current) => (current === customer.id ? null : customer.id))}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                              title="Diğer"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {menuId === customer.id ? (
                              <div className="absolute top-9 right-0 z-20 min-w-[9rem] rounded-md border border-[#e9ebec] bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuId(null);
                                    setActionError(null);
                                    setDeleteTarget(customer);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Sil
                                </button>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#e9ebec] px-4 py-2 text-xs text-slate-400">
          {filtered.length} / {customers.length} müşteri
        </div>
      </div>

      {deleteTarget ? (
        <DeleteModal
          title="Müşteriyi sil"
          description={`${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.email}) kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          isPending={isPending}
          error={actionError}
          onClose={() => {
            if (isPending) return;
            setDeleteTarget(null);
            setActionError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}

      {bulkDeleteOpen ? (
        <DeleteModal
          title="Seçilen müşterileri sil"
          description={`${selected.length} müşteri kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          isPending={isPending}
          error={actionError}
          onClose={() => {
            if (isPending) return;
            setBulkDeleteOpen(false);
          }}
          onConfirm={() => runBulk("delete", selected)}
        />
      ) : null}
    </>
  );
}
