"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";

type Extra = { id: string; name: string; description: string | null; price: number; priceType: string; maxQuantity: number };
type RatePlan = { id: string; name: string; mealPlan: string; refundable: boolean; modifier: number; cancellationPolicy: string | null };

type Props = {
  locale: Locale;
  dict: Dictionary;
  hotel: { id: string; name: string; city: string };
  room: { id: string; name: string; maxGuests: number; image: string | null };
  dates: { checkIn: string; checkOut: string; nights: number; human: string };
  guests: { adults: number; children: number };
  roomsLeft: number;
  nightlyFrom: number;
  extras: Extra[];
  ratePlans: RatePlan[];
  initialPromo: string;
};

export default function CheckoutForm({ locale, dict, hotel, room, dates, guests, roomsLeft, nightlyFrom, extras, ratePlans, initialPromo }: Props) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>(ratePlans[0]?.id ?? "");
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [promoInput, setPromoInput] = useState(initialPromo);
  const [promoApplied, setPromoApplied] = useState<string | null>(initialPromo || null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", country: "", city: "",
    specialRequests: "", arrivalTime: "",
  });

  const guestsCount = guests.adults + guests.children;

  // Client-side estimate for display only — the server recalculates authoritatively.
  const estimate = useMemo(() => {
    const plan = ratePlans.find((p) => p.id === selectedPlan);
    const roomsSubtotal = Math.round(nightlyFrom * dates.nights * 100) / 100;
    const withPlan = plan ? roomsSubtotal * (1 + plan.modifier / 100) : roomsSubtotal;
    const extrasTotal = extras.reduce((sum, e) => {
      const qty = selectedExtras[e.id] ?? 0;
      if (!qty) return sum;
      const units = e.priceType === "PER_NIGHT" ? dates.nights : e.priceType === "PER_PERSON" ? guestsCount : 1;
      return sum + e.price * units * qty;
    }, 0);
    const base = Math.round((withPlan + extrasTotal) * 100) / 100;
    return { rooms: Math.round(withPlan * 100) / 100, extras: Math.round(extrasTotal * 100) / 100, total: base };
  }, [selectedPlan, selectedExtras, nightlyFrom, dates.nights, extras, guestsCount, ratePlans]);

  function setExtraQty(id: string, qty: number) {
    setSelectedExtras((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: hotel.id,
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          adults: guests.adults,
          children: guests.children,
          locale,
          promoCode: promoApplied,
          specialRequests: form.specialRequests || null,
          arrivalTime: form.arrivalTime || null,
          rooms: [{ roomTypeId: room.id, ratePlanId: selectedPlan || null, quantity: 1 }],
          extras: Object.entries(selectedExtras).map(([extraId, quantity]) => ({ extraId, quantity })),
          guest: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            country: form.country || null,
            city: form.city || null,
          },
        }),
      });
      const data = (await res.json()) as
        | { ok: true; bookingId: string; reference: string }
        | { ok: false; error: string; detail?: string }
        | { error: string; issues?: { path: string; message: string }[] };
      const failed = !res.ok || "error" in data || ("ok" in data && data.ok !== true);
      if (failed) {
        const errCode = "error" in data ? data.error : "UNKNOWN";
        setServerError(humanizeError(errCode, locale));
        setSubmitting(false);
        return;
      }
      if ("ok" in data && data.ok === true) {
        router.push(`/${locale}/payment?booking=${encodeURIComponent(data.bookingId)}&ref=${encodeURIComponent(data.reference)}`);
        return;
      }
      setServerError("Unexpected response");
      setSubmitting(false);
    } catch {
      setServerError(locale === "tr" ? "Bağlantı hatası. Lütfen tekrar deneyin." : "Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const input = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const stepTitle = (n: number, title: string) => (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-400 bg-gold-300/10 font-display text-base text-gold-600">{n}</span>
      <h2 className="font-display text-xl">{title}</h2>
    </div>
  );

  return (
    <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_400px]">
      {/* Column 1: rate plan + extras */}
      <div className="space-y-5">
        {/* Step: rate plan */}
        <section aria-labelledby="plan-h">
          {stepTitle(1, "Rate plan")}
          <div className="mt-3 space-y-2.5">
            {ratePlans.map((p) => {
              const selected = selectedPlan === p.id;
              return (
                <label
                  key={p.id}
                  className={`group relative flex cursor-pointer items-start gap-3 border p-4 transition-all duration-300 ${
                    selected
                      ? "border-gold-400 bg-gold-300/10 shadow-gold"
                      : "border-sand-200 bg-white hover:border-gold-300 hover:shadow-card"
                  }`}
                >
                  <input type="radio" name="ratePlan" value={p.id} checked={selected} onChange={() => setSelectedPlan(p.id)} className="sr-only" />
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? "border-gold-500 bg-gold-400" : "border-sand-300 bg-white group-hover:border-gold-300"
                    }`}
                  >
                    {selected && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 6.5 5 9l4.5-5.5" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.modifier < 0 ? "bg-emerald-100 text-emerald-700" : p.modifier > 0 ? "bg-gold-300/20 text-gold-700" : "text-ink-muted"}`}>
                        {p.modifier === 0 ? "" : `${p.modifier > 0 ? "+" : ""}${p.modifier}%`}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {p.mealPlan.replace(/_/g, " ").toLowerCase()} · {p.refundable ? "Free cancellation" : "Non-refundable"}
                    </span>
                    {p.cancellationPolicy && <span className="mt-1 block text-xs text-ink-muted">{p.cancellationPolicy}</span>}
                  </span>
                </label>
              );
            })}
            {ratePlans.length === 0 && (
              <p className="text-sm text-ink-muted">Standard rate (room only).</p>
            )}
          </div>
        </section>

        {/* Step: extras */}
        <section aria-labelledby="extras-h">
          {stepTitle(2, "Extras")}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            {extras.map((e) => {
              const qty = selectedExtras[e.id] ?? 0;
              const active = qty > 0;
              return (
                <div
                  key={e.id}
                  className={`flex items-center justify-between gap-3 border p-3 transition-all duration-300 ${
                    active ? "border-emerald-500/60 bg-emerald-100/40 shadow-emerald" : "border-sand-200 bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    <p className={`text-xs font-medium ${active ? "text-emerald-700" : "text-gold-600"}`}>
                      +{formatMoney(e.price)}{e.priceType === "PER_NIGHT" ? " / night" : e.priceType === "PER_PERSON" ? " / person" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center rounded-lg border border-sand-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setExtraQty(e.id, qty - 1)}
                      disabled={qty <= 0}
                      aria-label={`${e.name} azalt`}
                      className="flex h-8 w-8 items-center justify-center rounded-l-lg text-lg text-ink-soft transition-colors hover:bg-sand-100 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span aria-live="polite" className={`w-7 text-center text-sm font-semibold ${active ? "text-emerald-700" : "text-ink-muted"}`}>{qty}</span>
                    <button
                      type="button"
                      onClick={() => setExtraQty(e.id, Math.min(qty + 1, e.maxQuantity))}
                      disabled={qty >= e.maxQuantity}
                      aria-label={`${e.name} artır`}
                      className="flex h-8 w-8 items-center justify-center rounded-r-lg text-lg text-ink-soft transition-colors hover:bg-gold-300/20 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {extras.length === 0 && <p className="text-sm text-ink-muted">No extras configured.</p>}
          </div>
        </section>

      </div>

      {/* Column 2: guest details */}
      <div className="space-y-5 lg:col-start-2 xl:col-start-2">
        <section aria-labelledby="guest-h">
          {stepTitle(3, "Guest details")}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <label htmlFor="g-first" className="label">First name *</label>
              <input id="g-first" required maxLength={80} autoComplete="given-name" className="input" {...input("firstName")} />
            </div>
            <div>
              <label htmlFor="g-last" className="label">Last name *</label>
              <input id="g-last" required maxLength={80} autoComplete="family-name" className="input" {...input("lastName")} />
            </div>
            <div>
              <label htmlFor="g-email" className="label">Email *</label>
              <input id="g-email" type="email" required maxLength={160} autoComplete="email" className="input" {...input("email")} />
            </div>
            <div>
              <label htmlFor="g-phone" className="label">Phone *</label>
              <input id="g-phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" className="input" {...input("phone")} />
            </div>
            <div>
              <label htmlFor="g-country" className="label">Country</label>
              <input id="g-country" maxLength={60} autoComplete="country-name" className="input" {...input("country")} />
            </div>
            <div>
              <label htmlFor="g-city" className="label">City</label>
              <input id="g-city" maxLength={60} autoComplete="address-level2" className="input" {...input("city")} />
            </div>
            <div>
              <label htmlFor="g-arrival" className="label">Estimated arrival time</label>
              <input id="g-arrival" placeholder="e.g. 18:30" maxLength={20} className="input" {...input("arrivalTime")} />
            </div>
            <div>
              <label htmlFor="g-requests" className="label">Special requests</label>
              <textarea id="g-requests" rows={3} maxLength={1000} className="input" {...input("specialRequests")} />
            </div>
          </div>
        </section>
      </div>

      {/* Summary sidebar */}
      <aside className="lg:col-span-2 xl:col-span-1 lg:sticky lg:top-24 lg:self-start" aria-label="Booking summary">
        <div className="card overflow-hidden">
          {room.image && (
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image src={room.image} alt={room.name} fill sizes="340px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink/70 to-transparent" />
              <p className="absolute bottom-2 left-4 text-xs uppercase tracking-widest2 text-gold-200">{hotel.name}</p>
            </div>
          )}
          <div className="p-6">
            <h3 className="font-display text-xl">{room.name}</h3>
            <p className="mt-1 text-sm text-ink-muted">{dates.human} · {dates.nights} {dict.booking.nights}</p>
            <p className="text-sm text-ink-muted">{guestsCount} {dict.booking.guests}</p>

            <dl className="mt-5 space-y-2 border-t border-sand-200 pt-4 text-sm">
              <div className="flex justify-between"><dt>Rooms</dt><dd>{formatMoney(estimate.rooms)}</dd></div>
              {estimate.extras > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>Extras</dt><dd>+{formatMoney(estimate.extras)}</dd></div>
              )}
              <div className="flex items-baseline justify-between border-t border-sand-200 pt-3">
                <dt className="font-display text-lg">Total</dt>
                <dd className="bg-gradient-to-r from-gold-600 to-gold-400 bg-clip-text font-display text-2xl text-transparent">{formatMoney(estimate.total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] leading-4 text-ink-muted">
              Taxes and fees are finalized on the server before payment. Currency: GEL.
            </p>

            {/* Promo */}
            <div className="mt-4 flex gap-2">
              <label htmlFor="promo" className="sr-only">{dict.booking.promoCode}</label>
              <input id="promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder={dict.booking.promoCode} className="input !py-2 text-sm" autoComplete="off" />
              <button type="button" onClick={() => setPromoApplied(promoInput.trim() || null)} className="btn-ghost !px-3 !py-2 text-xs">
                {locale === "tr" ? "Uygula" : "Apply"}
              </button>
            </div>
            {promoApplied && <p className="mt-1 text-xs text-emerald-700">Promo “{promoApplied}” will be validated server-side.</p>}

            {roomsLeft <= 2 && roomsLeft > 0 && (
              <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {locale === "tr" ? `Sadece ${roomsLeft} oda kaldı (gerçek envanter).` : `Only ${roomsLeft} room${roomsLeft > 1 ? "s" : ""} left (live inventory).`}
              </p>
            )}

            {serverError && (
              <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{serverError}</p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
              {submitting ? dict.common.loading + "…" : locale === "tr" ? "Devam et → Ödeme" : "Continue to payment"}
            </button>
            <p className="mt-3 text-[11px] leading-4 text-ink-muted">
              Secure booking · No account required · Your room is held for 15 minutes during payment.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function humanizeError(code: string, locale: Locale): string {
  const tr: Record<string, string> = {
    SOLD_OUT: "Bu oda az önce tükendi. Lütfen başka bir oda seçin.",
    PROMO_INVALID: "Promosyon kodu geçersiz veya süresi dolmuş.",
    MIN_STAY: "Seçilen tarihler minimum konaklama süresini karşılamıyor.",
    GUEST_OVER_CAPACITY: "Misafir sayısı oda kapasitesini aşıyor.",
    CHECK_IN_IN_PAST: "Giriş tarihi geçmiş olamaz.",
    VALIDATION_FAILED: "Lütfen form alanlarını kontrol edin.",
    RATE_LIMITED: "Çok fazla deneme. Bir dakika bekleyip tekrar deneyin.",
  };
  const en: Record<string, string> = {
    SOLD_OUT: "This room just sold out. Please choose another room.",
    PROMO_INVALID: "Promo code is invalid or expired.",
    MIN_STAY: "Your dates do not meet the minimum stay requirement.",
    GUEST_OVER_CAPACITY: "Guest count exceeds room capacity.",
    CHECK_IN_IN_PAST: "Check-in date cannot be in the past.",
    VALIDATION_FAILED: "Please check the form fields.",
    RATE_LIMITED: "Too many attempts. Please wait a minute and retry.",
  };
  const map = locale === "tr" ? tr : en;
  return map[code] ?? (locale === "tr" ? "Bir hata oluştu. Lütfen tekrar deneyin." : "Something went wrong. Please try again.");
}
