import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const revalidate = 300;

export default async function HotelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const hotels = await db.hotel.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      translations: { where: { locale } },
      images: { where: { isFeatured: true }, take: 1 },
      rooms: { where: { isActive: true }, orderBy: { basePrice: "asc" }, take: 1 },
      amenities: { include: { amenity: true }, take: 6 },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <p className="kicker">{dict.home.propertiesKicker}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{dict.home.propertiesTitle}</h1>

      <div className="mt-10 space-y-10">
        {hotels.map((hotel, i) => {
          const t = hotel.translations[0];
          const from = hotel.rooms[0] ? Number(hotel.rooms[0].basePrice) : null;
          return (
            <article key={hotel.id} className="reveal card-hover card grid overflow-hidden md:grid-cols-[360px_1fr]" style={{ "--reveal-delay": `${i * 120}ms` } as React.CSSProperties}>
              <div className="relative min-h-[240px]">
                {hotel.images[0] ? (
                  <Image src={hotel.images[0].url} alt={hotel.images[0].alt ?? hotel.name} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-sand-100 text-xs uppercase tracking-widest2 text-ink-muted">PLACEHOLDER</div>
                )}
              </div>
              <div className="flex flex-col p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest2 text-ink-muted">{hotel.city}, Georgia</p>
                <h2 className="mt-1 font-display text-2xl font-bold">{t?.name ?? hotel.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">{t?.description ?? hotel.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {hotel.amenities.slice(0, 5).map(({ amenity }) => (
                    <li key={amenity.id} className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-medium capitalize text-ink-soft">{amenity.key.replace(/_/g, " ")}</li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
                  <div>
                    {from !== null && (
                      <>
                        <p className="text-xs text-ink-muted">{dict.common.from}</p>
                        <p className="font-display text-2xl font-bold text-ink">
                          {formatMoney(from)}
                          <span className="text-sm font-medium text-ink-muted"> {dict.common.perNight}</span>
                        </p>
                      </>
                    )}
                  </div>
                  <Link href={`/${locale}/booking/search?hotel=${hotel.id}`} className="btn-primary !px-5 !py-2.5 text-sm">{dict.common.checkAvailability}</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {hotels.length === 0 && (
        <p className="mt-10 text-sm text-ink-muted">Properties pending — NEEDS ADMIN VERIFICATION.</p>
      )}
    </div>
  );
}
