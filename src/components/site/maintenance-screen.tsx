import { Wrench } from "lucide-react";

export function MaintenanceScreen({
  siteName,
  email,
  phone,
}: {
  siteName: string;
  email?: string;
  phone?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-site-bg px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Wrench className="h-7 w-7" />
      </span>
      <p className="mt-6 text-sm font-semibold text-site-primary">{siteName}</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-site-fg sm:text-4xl">
        Bakımdayız
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-site-muted sm:text-base">
        Sitemiz kısa süreliğine bakımdadır. Lütfen daha sonra tekrar deneyin.
      </p>
      {email || phone ? (
        <p className="mt-6 text-sm text-site-fg">
          {phone ? <a href={`tel:${phone}`} className="hover:underline">{phone}</a> : null}
          {phone && email ? " · " : null}
          {email ? <a href={`mailto:${email}`} className="hover:underline">{email}</a> : null}
        </p>
      ) : null}
    </div>
  );
}
