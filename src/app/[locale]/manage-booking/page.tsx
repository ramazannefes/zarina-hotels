"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type BookingView = {
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  hotel: { name: string; city: string; phone: string | null };
  rooms: { name: string; quantity: number }[];
  grandTotal: string;
  currency: string;
  paymentStatus: string | null;
};

function ManageBookingInner() {
  const sp = useSearchParams();
  const [reference, setReference] = useState(sp.get("ref") ?? "");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBooking(null);
    setBusy(true);
    try {
      const res = await fetch("/api/manage-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      if (res.status === 404) {
        setError("No booking found for this reference and email combination.");
      } else if (res.status === 429) {
        setError("Too many attempts. Please wait a minute.");
      } else if (!res.ok) {
        setError("Lookup failed. Please try again.");
      } else {
        const data = (await res.json()) as { booking: BookingView };
        setBooking(data.booking);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-3xl">Manage your booking</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter your booking reference and the email used at reservation. For security, both must match.
      </p>

      <form onSubmit={lookup} className="card mt-8 space-y-4 p-6">
        <div>
          <label htmlFor="mb-ref" className="label">Booking reference</label>
          <input id="mb-ref" required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ZAR-2026-XXXXXX" className="input uppercase" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="mb-email" className="label">Email</label>
          <input id="mb-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
        </div>
        {error && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Searching…" : "Find my booking"}
        </button>
      </form>

      {booking && (
        <div className="card mt-8 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl">{booking.reference}</h2>
            <span className="bg-sand-100 px-3 py-1 text-xs font-medium uppercase tracking-widest2 text-ink-soft">{booking.status}</span>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Hotel</dt><dd>{booking.hotel.name}, {booking.hotel.city}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Dates</dt><dd>{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)} · {booking.nights} nights</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Rooms</dt><dd>{booking.rooms.map((r) => `${r.name} ×${r.quantity}`).join(", ")}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Guests</dt><dd>{booking.adults} adults{booking.children ? ` + ${booking.children} children` : ""}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">Payment</dt><dd>{booking.paymentStatus ?? "PENDING"}</dd></div>
            <div className="flex justify-between gap-4 border-t border-sand-200 pt-2 font-medium"><dt>Total</dt><dd>{booking.currency} {booking.grandTotal}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink-muted">
            Need to change or cancel? Cancellation eligibility depends on your rate plan — call the hotel for immediate assistance.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-5 py-16 text-sm text-ink-muted">Loading…</div>}>
      <ManageBookingInner />
    </Suspense>
  );
}
