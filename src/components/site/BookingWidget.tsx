"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Expedia-style search bar: one white rounded container split into
 * bordered sections (destination / dates / travellers / promo), with a
 * blue pill button on the right. Stacks vertically on small screens.
 */
export default function BookingWidget({ locale, dict, hotels }: { locale: Locale; dict: Dictionary; hotels: { id: string; name: string; city: string }[] }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(todayPlus(1));
  const [checkOut, setCheckOut] = useState(todayPlus(3));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [hotelId, setHotelId] = useState("");
  const [promo, setPromo] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
      rooms: String(rooms),
    });
    if (hotelId) params.set("hotel", hotelId);
    if (promo.trim()) params.set("promo", promo.trim());
    router.push(`/${locale}/booking/results?${params.toString()}`);
  }

  const sectionClass =
    "relative flex-1 min-w-[150px] border-b border-sand-200 px-4 py-2.5 focus-within:bg-sea-100/40 transition-colors lg:border-b-0 lg:border-r lg:last:border-r-0";

  return (
    <form
      onSubmit={submit}
      aria-label="Booking search"
      className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-lift lg:flex-row lg:items-stretch lg:rounded-full lg:py-1.5 lg:pl-2 lg:pr-1.5"
    >
      {/* Destination */}
      <div className={`${sectionClass} lg:flex-[1.6]`}>
        <label htmlFor="bw-hotel" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.destination}
        </label>
        <select id="bw-hotel" value={hotelId} onChange={(e) => setHotelId(e.target.value)} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0">
          <option value="">{locale === "tr" ? "Tüm tesisler" : locale === "ka" ? "ყველა ობიექტი" : "All properties"}</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} — {h.city}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className={`${sectionClass} lg:flex-[1]`}>
        <label htmlFor="bw-in" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.checkIn}
        </label>
        <input id="bw-in" type="date" required min={todayPlus(0)} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0" />
      </div>
      <div className={`${sectionClass} lg:flex-[1]`}>
        <label htmlFor="bw-out" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.checkOut}
        </label>
        <input id="bw-out" type="date" required min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0" />
      </div>

      {/* Travellers */}
      <div className={`${sectionClass} lg:flex-[0.9]`}>
        <label htmlFor="bw-adults" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.adults}
        </label>
        <select id="bw-adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className={`${sectionClass} lg:flex-[0.9]`}>
        <label htmlFor="bw-children" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.children}
        </label>
        <select id="bw-children" value={children} onChange={(e) => setChildren(Number(e.target.value))} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0">
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className={`${sectionClass} lg:flex-[0.9]`}>
        <label htmlFor="bw-rooms" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.rooms}
        </label>
        <select id="bw-rooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none focus:ring-0">
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Promo */}
      <div className={`${sectionClass} lg:flex-[1]`}>
        <label htmlFor="bw-promo" className="block text-[11px] font-semibold text-ink-muted">
          {dict.booking.promoCode}
        </label>
        <input id="bw-promo" type="text" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="ZARINA10" autoComplete="off" className="w-full border-0 bg-transparent p-0 text-sm font-medium text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-0" />
      </div>

      {/* Search */}
      <div className="p-3 lg:flex lg:items-center lg:p-0 lg:pr-1.5">
        <button type="submit" className="btn-primary w-full !rounded-full px-7 lg:w-auto">
          {dict.booking.search}
        </button>
      </div>
    </form>
  );
}
