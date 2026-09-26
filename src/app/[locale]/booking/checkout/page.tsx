import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { getRoomAvailability, validateDateRange } from "@/lib/availability";
import { formatMoney, nightsBetween, formatDateHuman } from "@/lib/money";
import CheckoutForm from "@/components/booking/CheckoutForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const hotelId = param(sp, "hotel");
  const roomTypeId = param(sp, "room");
  const checkIn = param(sp, "checkIn");
  const checkOut = param(sp, "checkOut");
  const adults = Math.max(1, parseInt(param(sp, "adults") || "2", 10) || 2);
  const children = Math.max(0, parseInt(param(sp, "children") || "0", 10) || 0);
  const promo = param(sp, "promo");

  if (!hotelId || !roomTypeId || !checkIn || !checkOut) notFound();

  try {
    validateDateRange(checkIn, checkOut);
  } catch {
    notFound();
  }

  const hotel = await db.hotel.findUnique({ where: { id: hotelId }, include: { translations: { where: { locale } } } });
  const room = await db.roomType.findUnique({ where: { id: roomTypeId }, include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } });
  if (!hotel || !room || room.hotelId !== hotelId) notFound();

  const availability = await getRoomAvailability({ hotelId, checkIn, checkOut, adults, children });
  const avail = availability.find((r) => r.roomTypeId === roomTypeId);
  if (!avail || avail.status === "sold_out") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl">{dict.common.soldOut}</h1>
        <p className="mt-3 text-sm text-ink-muted">This room is no longer available for your dates.</p>
      </div>
    );
  }

  const extras = await db.extra.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const ratePlans = await db.ratePlan.findMany({ where: { roomTypeId, isActive: true } });
  const nights = nightsBetween(checkIn, checkOut);

  const steps =
    locale === "tr"
      ? ["Oda & tarih", "Ekstralar", "Misafir bilgileri", "Ödeme", "Onay"]
      : locale === "ka"
        ? ["ოთახი & თარიღი", "დამატებები", "სტუმრის მონაცემები", "გადახდა", "დადასტურება"]
        : ["Room & dates", "Extras", "Guest details", "Payment", "Confirmation"];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-widest2 text-ink-muted" aria-label="Checkout progress">
        {steps.map((s, idx) => (
          <li key={s} className="flex items-center gap-2">
            {idx > 0 && <span aria-hidden="true" className="text-sand-300">→</span>}
            <span className={idx === 0 ? "font-semibold text-gold-600" : ""} aria-current={idx === 0 ? "step" : undefined}>
              {idx + 1} · {s}
            </span>
          </li>
        ))}
      </ol>

      <div>
        <CheckoutForm
          locale={locale}
          dict={dict}
          hotel={{ id: hotel.id, name: hotel.translations[0]?.name ?? hotel.name, city: hotel.city }}
          room={{ id: room.id, name: room.name, maxGuests: room.maxGuests, image: room.images[0]?.url ?? null }}
          dates={{ checkIn, checkOut, nights, human: `${formatDateHuman(checkIn, locale)} → ${formatDateHuman(checkOut, locale)}` }}
          guests={{ adults, children }}
          roomsLeft={avail.sellable}
          nightlyFrom={avail.avgNightly}
          extras={extras.map((e) => ({ id: e.id, name: e.name, description: e.description, price: Number(e.price), priceType: e.priceType, maxQuantity: e.maxQuantity }))}
          ratePlans={ratePlans.map((p) => ({ id: p.id, name: p.name, mealPlan: p.mealPlan, refundable: p.refundable, modifier: Number(p.priceModifierPercent), cancellationPolicy: p.cancellationPolicy }))}
          initialPromo={promo}
        />
      </div>
    </div>
  );
}
