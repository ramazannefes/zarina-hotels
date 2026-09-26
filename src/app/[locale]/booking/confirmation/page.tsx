import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { formatMoney, formatDateHuman } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  if (!ref) notFound();

  const booking = await db.booking.findUnique({
    where: { reference: ref.toUpperCase() },
    include: {
      hotel: { select: { name: true, city: true, phone: true, address: true } },
      rooms: { include: { roomType: { select: { name: true } } } },
      guest: { select: { firstName: true, lastName: true, email: true } },
      payments: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!booking) notFound();
  // Confirmation page only shows bookings that reached a valid state
  if (!["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"].includes(booking.status)) notFound();

  const paymentStatus = booking.payments[0]?.status ?? "PENDING";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700" aria-hidden="true">✓</div>
        <h1 className="mt-5 font-display text-3xl">
          {booking.status === "CONFIRMED" ? (locale === "tr" ? "Rezervasyonunuz onaylandı" : "Your booking is confirmed") : (locale === "tr" ? "Rezervasyonunuz alındı" : "Booking received")}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {locale === "tr"
            ? `Onay e-postası ${booking.guest?.email} adresine gönderildi.`
            : `A confirmation email has been sent to ${booking.guest?.email}.`}
        </p>

        <p className="mt-6 text-xs uppercase tracking-widest2 text-ink-muted">Booking reference</p>
        <p className="font-display text-3xl tracking-wider text-gold-600">{booking.reference}</p>

        <dl className="mt-8 space-y-3 border-t border-sand-200 pt-6 text-left text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Hotel</dt><dd className="text-right">{booking.hotel.name}, {booking.hotel.city}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Guest</dt><dd>{booking.guest?.firstName} {booking.guest?.lastName}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Dates</dt><dd>{formatDateHuman(booking.checkIn, locale)} → {formatDateHuman(booking.checkOut, locale)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Nights</dt><dd>{booking.nights}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Rooms</dt><dd className="text-right">{booking.rooms.map((r) => `${r.roomType.name} ×${r.quantity}`).join(", ")}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Guests</dt><dd>{booking.adults} + {booking.children} children</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-muted">Payment</dt><dd>{paymentStatus}</dd></div>
          <div className="flex justify-between gap-4 border-t border-sand-200 pt-3 font-display text-lg"><dt>Total</dt><dd className="text-gold-600">{formatMoney(Number(booking.grandTotal))}</dd></div>
        </dl>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}/manage-booking?ref=${booking.reference}`} className="btn-primary !px-5 !py-2.5 text-xs">
            {dict.nav.manageBooking}
          </Link>
          {booking.hotel.phone && (
            <a href={`tel:${booking.hotel.phone.replace(/\s/g, "")}`} className="btn-ghost !px-5 !py-2.5 text-xs">
              {booking.hotel.phone}
            </a>
          )}
        </div>

        <p className="mt-6 text-[11px] leading-4 text-ink-muted">
          Check-in from {booking.status === "CONFIRMED" ? "14:00" : "14:00"} · Front desk 24/7 · Present this reference at arrival.
        </p>
      </div>
    </div>
  );
}
