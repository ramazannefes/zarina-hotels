import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { getRoomAvailability, validateDateRange } from "@/lib/availability";
import { formatMoney, formatDateHuman, nightsBetween } from "@/lib/money";
import { BookingError } from "@/lib/booking";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

export default async function ResultsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const hotelId = param(sp, "hotel");
  const checkIn = param(sp, "checkIn");
  const checkOut = param(sp, "checkOut");
  const adults = Math.max(1, parseInt(param(sp, "adults") || "2", 10) || 2);
  const children = Math.max(0, parseInt(param(sp, "children") || "0", 10) || 0);
  const promo = param(sp, "promo");

  if (!hotelId) {
    const hotels = await db.hotel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    return (
      <div className="section-pad mx-auto max-w-3xl">
        <h1 className="font-display text-3xl">Choose a property</h1>
        <ul className="mt-6 space-y-3">
          {hotels.map((h) => (
            <li key={h.id} className="card flex items-center justify-between p-5">
              <div>
                <p className="font-display text-xl">{h.name}</p>
                <p className="text-sm text-ink-muted">{h.city}, Georgia</p>
              </div>
              <Link href={`/${locale}/booking/results?hotel=${h.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`} className="btn-primary !px-4 !py-2 text-xs">
                {dict.common.checkAvailability}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hotel = await db.hotel.findUnique({ where: { id: hotelId }, include: { translations: { where: { locale } } } });
  if (!hotel) notFound();

  let rooms: Awaited<ReturnType<typeof getRoomAvailability>> = [];
  let error: string | null = null;
  try {
    validateDateRange(checkIn, checkOut);
    rooms = await getRoomAvailability({ hotelId, checkIn, checkOut, adults, children });
  } catch (err) {
    rooms = [];
    error = err instanceof BookingError ? err.code : "INVALID_DATES";
  }

  const nights = nightsBetween(checkIn, checkOut);
  const anyAvailable = rooms.some((r) => r.status !== "sold_out");

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      {/* Search summary */}
      <div className="card mb-10 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="kicker">{hotel.city}, Georgia</p>
          <h1 className="mt-1 font-display text-2xl">{hotel.translations[0]?.name ?? hotel.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDateHuman(checkIn, locale)} → {formatDateHuman(checkOut, locale)} · {nights} {dict.booking.nights} · {adults + children} {dict.booking.guests}
          </p>
        </div>
        <Link href={`/${locale}#book`} className="btn-ghost !px-4 !py-2 text-xs">Change dates</Link>
      </div>

      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error === "CHECK_IN_IN_PAST" ? "Check-in date cannot be in the past." : "Invalid dates — please adjust your search."}
        </div>
      )}

      {!error && !anyAvailable && (
        <div className="card p-8 text-center" role="status">
          <h2 className="font-display text-2xl">{dict.common.soldOut}</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {locale === "tr"
              ? "Seçtiğiniz tarihlerde müsait oda bulunamadı. Farklı tarihleri deneyin veya başka bir tesise göz atın."
              : "No rooms available for your dates. Try nearby dates or explore our other property."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}#book`} className="btn-primary !px-4 !py-2 text-xs">New search</Link>
            <Link href={`/${locale}/hotels`} className="btn-ghost !px-4 !py-2 text-xs">{dict.nav.hotels}</Link>
          </div>
        </div>
      )}

      <ul className="space-y-6">
        {rooms?.map((room) => (
          <li key={room.roomTypeId} className="card grid gap-6 overflow-hidden md:grid-cols-[280px_1fr]">
            <div className="relative min-h-[200px]">
              {room.images[0] ? (
                <Image src={room.images[0].url} alt={room.images[0].alt ?? room.name} fill sizes="(min-width: 768px) 280px, 100vw" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-sand-100 text-xs uppercase tracking-widest2 text-ink-muted">PLACEHOLDER</div>
              )}
            </div>
            <div className="flex flex-col py-5 pr-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl">{room.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">{room.shortDescription}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
                    <li>{room.sizeSqm ? `${room.sizeSqm} m²` : ""}</li>
                    <li>{room.bedDescription ?? room.viewType.toLowerCase()} view</li>
                    <li>Max {room.maxGuests}</li>
                    {room.breakfastIncluded && <li className="text-gold-600">Breakfast included</li>}
                  </ul>
                </div>
                <div className="text-right">
                  {room.status === "available" && (
                    <span className="inline-block bg-green-50 px-2 py-1 text-xs font-medium text-green-800">{dict.common.available}</span>
                  )}
                  {room.status === "limited" && (
                    <span className="inline-block bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      {room.sellable > 0 ? `${room.sellable} ${dict.common.limited}` : dict.common.limited}
                    </span>
                  )}
                  {room.status === "sold_out" && (
                    <span className="inline-block bg-sand-100 px-2 py-1 text-xs font-medium text-ink-muted">{dict.common.soldOut}</span>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <p>
                  <strong className="font-display text-2xl text-gold-600">{formatMoney(room.nightsPrice)}</strong>
                  <span className="text-sm text-ink-muted"> / {nights} {dict.booking.nights} · {formatMoney(room.avgNightly)} {dict.common.perNight}</span>
                </p>
                {room.status !== "sold_out" ? (
                  <Link
                    href={`/${locale}/booking/checkout?hotel=${hotelId}&room=${room.roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}${promo ? `&promo=${encodeURIComponent(promo)}` : ""}`}
                    className="btn-primary whitespace-nowrap !px-5 !py-2.5 text-xs"
                  >
                    {dict.common.bookNow}
                  </Link>
                ) : (
                  <span className="text-xs text-ink-muted">{room.minStayViolation ? "Min. stay rules apply" : ""}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
