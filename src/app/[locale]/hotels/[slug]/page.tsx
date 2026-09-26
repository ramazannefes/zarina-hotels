import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const hotel = await db.hotel.findUnique({ where: { slug }, include: { translations: true } });
  if (!hotel) return {};
  const t = hotel.translations.find((x) => x.locale === locale) ?? hotel.translations[0];
  return {
    title: t?.metaTitle ?? `${hotel.name} — ${hotel.city}`,
    description: t?.metaDescription ?? hotel.description?.slice(0, 160) ?? `${hotel.name} in ${hotel.city}, Georgia.`,
    alternates: { canonical: `/${locale}/hotels/${slug}` },
    openGraph: { title: t?.metaTitle ?? hotel.name, description: t?.metaDescription ?? undefined },
  };
}

export default async function HotelDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const hotel = await db.hotel.findUnique({
    where: { slug },
    include: {
      translations: { where: { locale } },
      images: { orderBy: { sortOrder: "asc" } },
      rooms: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } } },
      amenities: { include: { amenity: true } },
      faqs: { where: { locale, isActive: true }, orderBy: { sortOrder: "asc" } },
      experiences: { where: { locale, isActive: true }, orderBy: { sortOrder: "asc" } },
      reviews: { where: { isPublished: true, locale }, take: 6 },
    },
  });
  if (!hotel || !hotel.isActive) notFound();
  const t = hotel.translations[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: t?.name ?? hotel.name,
    description: t?.description ?? hotel.description,
    telephone: hotel.phone,
    starRating: { "@type": "Rating", ratingValue: hotel.stars },
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      addressCountry: "GE",
    },
    ...(hotel.latitude && hotel.longitude ? { geo: { "@type": "GeoCoordinates", latitude: hotel.latitude, longitude: hotel.longitude } } : {}),
    checkinTime: "14:00",
    checkoutTime: "12:00",
    ...(hotel.airportKm ? { amenityFeature: [{ "@type": "LocationFeatureSpecification", name: "Airport shuttle" }] } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div className="absolute inset-0 -z-10">
          {hotel.images[0] ? (
            <Image src={hotel.images[0].url} alt={hotel.images[0].alt ?? hotel.name} fill priority sizes="100vw" className="object-cover opacity-70" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-ink to-ink-soft" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/40" />
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-28 sm:px-8 sm:pt-36">
          <p className="kicker !text-gold-300">{hotel.city}, Georgia</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl text-cream sm:text-5xl">{t?.name ?? hotel.name}</h1>
          <p className="mt-4 max-w-xl text-sand-100/85">{t?.description ?? hotel.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-sand-100/75">
            <span>Check-in {hotel.checkInFrom}</span>
            <span aria-hidden="true">·</span>
            <span>Check-out {hotel.checkOutTo}</span>
            {hotel.airportKm !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>Airport {hotel.airportKm} km</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Sticky booking bar */}
      <div className="sticky top-0 z-40 border-b border-sand-200 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="text-sm">
            <span className="text-ink-muted">{dict.common.from}</span>{" "}
            <strong className="font-display text-lg text-gold-600">{formatMoney(Math.min(...hotel.rooms.map((r) => Number(r.basePrice))))}</strong>
            <span className="text-ink-muted"> {dict.common.perNight}</span>
          </p>
          <Link href={`/${locale}/booking/search?hotel=${hotel.id}`} className="btn-primary !px-5 !py-2 text-xs">{dict.common.bookNow}</Link>
        </div>
      </div>

      {/* Gallery */}
      {hotel.images.length > 0 && (
        <section className="section-pad" aria-label="Photo gallery">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hotel.images.slice(0, 8).map((img, i) => (
              <div key={img.id} className={`reveal relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-[4/3]"}`} style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}>
                <Image src={img.url} alt={img.alt ?? `${hotel.name} photo ${i + 1}`} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-105" />
              </div>
            ))}
          </div>
          {hotel.images.some((i) => i.isPlaceholder) && (
            <p className="mx-auto mt-3 max-w-7xl text-xs text-amber-700">PLACEHOLDER — REPLACE WITH OFFICIAL ZARINA HOTEL MEDIA</p>
          )}
        </section>
      )}

      {/* Rooms */}
      <section id="rooms" className="section-pad border-t border-sand-200" aria-labelledby="rooms-h">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <h2 id="rooms-h" className="section-title inline-block"><span className="reveal-line pb-1">Rooms & Suites</span></h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hotel.rooms.map((room, i) => (
              <article key={room.id} className="reveal card-hover card flex flex-col overflow-hidden" style={{ "--reveal-delay": `${(i % 3) * 120}ms` } as React.CSSProperties}>
                <div className="relative aspect-[4/3]">
                  {room.images[0] ? (
                    <Image src={room.images[0].url} alt={room.images[0].alt ?? room.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-sand-100 text-xs uppercase tracking-widest2 text-ink-muted">PLACEHOLDER</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl">{room.name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{room.shortDescription}</p>
                  <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                    <li>{room.sizeSqm ? `${room.sizeSqm} m² · ` : ""}{room.bedDescription ?? room.bedType.toLowerCase()}</li>
                    <li>Max {room.maxGuests} guests{room.breakfastIncluded ? " · Breakfast included" : ""}</li>
                  </ul>
                  <p className="mt-4">
                    <span className="text-sm text-ink-muted">{dict.common.from}</span>{" "}
                    <strong className="font-display text-xl text-gold-600">{formatMoney(Number(room.basePrice))}</strong>
                    <span className="text-sm text-ink-muted"> {dict.common.perNight}</span>
                  </p>
                  <Link href={`/${locale}/booking/search?hotel=${hotel.id}&room=${room.id}`} className="btn-primary mt-4 !px-4 !py-2 text-xs self-start">
                    {dict.common.checkAvailability}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="border-t border-sand-200 bg-sand-50 section-pad" aria-labelledby="amenities-h">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <h2 id="amenities-h" className="section-title">Amenities</h2>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {hotel.amenities.map(({ amenity }, i) => (
              <li key={amenity.id} className="reveal flex items-center gap-2" style={{ "--reveal-delay": `${(i % 4) * 70}ms` } as React.CSSProperties}>
                <span className="text-gold-500" aria-hidden="true">◆</span>
                <span className="capitalize">{amenity.key.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Experiences */}
      {hotel.experiences.length > 0 && (
        <section className="section-pad" aria-labelledby="exp-h">
          <div className="mx-auto max-w-7xl">
            <div className="reveal">
              <h2 id="exp-h" className="section-title">Experiences</h2>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.experiences.map((e, i) => (
                <article key={e.id} className="reveal card-hover card p-6" style={{ "--reveal-delay": `${(i % 3) * 100}ms` } as React.CSSProperties}>
                  <h3 className="font-display text-xl text-gold-600">{e.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{e.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location */}
      <section className="border-t border-sand-200 bg-sand-50 section-pad" aria-labelledby="loc-h">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="reveal reveal-left">
            <h2 id="loc-h" className="section-title">Location</h2>
            <address className="mt-4 not-italic leading-7 text-ink-soft">
              {hotel.address}<br />{hotel.city}, Georgia
            </address>
            {hotel.phone && <p className="mt-2"><a href={`tel:${hotel.phone.replace(/\s/g, "")}`} className="link-underline">{hotel.phone}</a></p>}
            {hotel.email && <p className="mt-1"><a href={`mailto:${hotel.email}`} className="link-underline">{hotel.email}</a></p>}
          </div>
          <div className="reveal reveal-right min-h-[300px] border border-sand-200 bg-white">
            {hotel.mapEmbedUrl ? (
              <iframe src={hotel.mapEmbedUrl} title={`Map — ${hotel.name}`} className="h-full w-full" loading="lazy" />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-xs text-ink-muted">
                Map needs Google Maps embed URL — NEEDS ADMIN VERIFICATION
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {hotel.faqs.length > 0 && (
        <section className="section-pad" aria-labelledby="faq-h">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq-h" className="font-display text-3xl">Questions</h2>
            <div className="mt-6 divide-y divide-sand-200">
              {hotel.faqs.map((f) => (
                <details key={f.id} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="text-gold-500" aria-hidden="true">＋ </span>{f.question}
                  </summary>
                  <p className="mt-2 pl-6 text-sm leading-6 text-ink-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {hotel.reviews.length > 0 && (
        <section className="border-t border-sand-200 bg-sand-50 section-pad" aria-labelledby="rev-h">
          <div className="mx-auto max-w-7xl">
            <h2 id="rev-h" className="font-display text-3xl">Guest reviews</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {hotel.reviews.map((r) => (
                <blockquote key={r.id} className="card p-6">
                  <p className="text-gold-500" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-sand-300">{"★".repeat(5 - r.rating)}</span></p>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{r.body}</p>
                  <footer className="mt-3 text-xs text-ink-muted">— {r.guestName}{r.country ? `, ${r.country}` : ""} · {r.source}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
