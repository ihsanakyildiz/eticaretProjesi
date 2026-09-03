"use client";

import type { FormEvent } from "react";

export function FooterNewsletterForm() {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form className="flex w-full max-w-md shrink-0 gap-2" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="footer-newsletter-email">
        E-posta adresiniz
      </label>
      <input
        id="footer-newsletter-email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="E-posta adresiniz"
        className="h-9 min-w-0 flex-1 rounded-md border border-site-border bg-site-card px-3 text-xs text-site-fg outline-none placeholder:text-site-muted focus:border-site-primary"
      />
      <button
        type="submit"
        className="h-9 shrink-0 rounded-md bg-site-primary px-3.5 text-xs font-medium text-white transition hover:brightness-110"
      >
        Abone ol
      </button>
    </form>
  );
}
