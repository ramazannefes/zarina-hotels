"use client";

import { useState } from "react";

type Props = {
  locale: string;
  hotels: { id: string; name: string }[];
};

export default function ContactForm({ locale, hotels }: Props) {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone") || null,
          hotelId: fd.get("hotelId") || null,
          subject: fd.get("subject"),
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
        }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMsg(res.status === 429 ? "Too many messages — please wait a minute." : "Please check your entries and try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
    setBusy(false);
  }

  if (status === "sent") {
    return (
      <div className="card p-8 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl text-green-700" aria-hidden="true">✓</div>
        <h2 className="mt-4 font-display text-2xl">{locale === "tr" ? "Mesajınız alındı" : "Message received"}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {locale === "tr" ? "En kısa sürede size döneceğiz." : "Thank you — our team will reply shortly."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
      {/* Honeypot — hidden from users */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">{locale === "tr" ? "Ad Soyad *" : "Full name *"}</label>
          <input id="c-name" name="name" required minLength={2} maxLength={80} className="input" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="c-email" className="label">Email *</label>
          <input id="c-email" name="email" type="email" required maxLength={160} className="input" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="c-phone" className="label">{locale === "tr" ? "Telefon" : "Phone"}</label>
          <input id="c-phone" name="phone" type="tel" maxLength={30} className="input" autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="c-hotel" className="label">{locale === "tr" ? "Tesis" : "Property"}</label>
          <select id="c-hotel" name="hotelId" className="input">
            <option value="">{locale === "tr" ? "Genel" : "General"}</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-subject" className="label">{locale === "tr" ? "Konu *" : "Subject *"}</label>
        <input id="c-subject" name="subject" required minLength={2} maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="c-message" className="label">{locale === "tr" ? "Mesajınız *" : "Message *"}</label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={2000} rows={5} className="input" />
      </div>
      {status === "error" && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : locale === "tr" ? "Gönder" : "Send message"}
      </button>
    </form>
  );
}
