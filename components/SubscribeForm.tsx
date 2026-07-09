"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";

type SubscribeStatus = "subscribed" | "stored" | "pending";

export default function SubscribeForm({ t }: { t: Dict }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const value = email.trim();
    if (!value) {
      setError(t.newsletterInvalid);
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: SubscribeStatus;
        error?: string;
      };

      if (!res.ok || data.ok === false) {
        setError(data.error === "invalid_email" ? t.newsletterInvalid : t.newsletterError);
        return;
      }

      setMessage(data.status === "pending" ? t.newsletterPending : t.newsletterSuccess);
      setEmail("");
    } catch {
      setError(t.newsletterError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="newsletter" aria-label={t.newsletterTitle}>
      <h3 className="newsletter__title">{t.newsletterTitle}</h3>
      <p className="newsletter__hint">{t.newsletterHint}</p>
      <form className="newsletter__form" onSubmit={onSubmit}>
        <input
          className="newsletter__input"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder={t.newsletterEmailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          required
        />
        <button className="btn btn--primary newsletter__btn" type="submit" disabled={submitting}>
          {submitting ? t.newsletterSubmitting : t.newsletterSubmit}
        </button>
      </form>
      {message && <p className="newsletter__ok">{message}</p>}
      {error && <p className="newsletter__err">{error}</p>}
    </section>
  );
}
