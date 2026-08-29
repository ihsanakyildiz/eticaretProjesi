import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadCheckoutAddresses } from "@/lib/checkout";
import { deleteMemberAddressAction, ensureMemberPortalAccess } from "../actions";
import { MemberAddressForm } from "./member-address-form";

export const metadata: Metadata = {
  title: "Adres bilgileri",
};

function formatAddressLine(address: {
  firstName: string;
  lastName: string;
  line1: string;
  district: string | null;
  neighborhood: string | null;
  city: string;
  postalCode: string | null;
  country: string;
}) {
  return [
    `${address.firstName} ${address.lastName}`,
    address.line1,
    [address.neighborhood, address.district, address.city].filter(Boolean).join(", "),
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function MemberAddressesPage() {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye/adresler");
  }

  const addresses = await loadCheckoutAddresses(access.session.user.id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Kayıtlı adresler</h2>
        <p className="mt-1 text-sm text-site-muted">
          Teslimat ve fatura adreslerinizi buradan yönetebilirsiniz.
        </p>

        {addresses.length === 0 ? (
          <p className="mt-6 text-sm text-site-muted">Henüz kayıtlı adresiniz yok.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex flex-col gap-3 rounded-xl border border-site-border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium text-site-fg">{address.alias}</p>
                  <p className="mt-1 text-sm text-site-muted">{formatAddressLine(address)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-site-muted">
                    {address.isDefaultDelivery ? (
                      <span className="rounded-full bg-site-primary-soft px-2 py-0.5 text-site-primary">
                        Varsayılan teslimat
                      </span>
                    ) : null}
                    {address.isDefaultInvoice ? (
                      <span className="rounded-full bg-site-surface px-2 py-0.5">
                        Varsayılan fatura
                      </span>
                    ) : null}
                    {address.phone ? <span>{address.phone}</span> : null}
                  </div>
                </div>
                <form action={deleteMemberAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600"
                  >
                    Sil
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-site-fg">Yeni adres ekle</h2>
        <div className="mt-4">
          <MemberAddressForm />
        </div>
      </section>
    </div>
  );
}
