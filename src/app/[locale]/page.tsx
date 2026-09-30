import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import BookingWidget from "@/components/site/BookingWidget";
import GalleryPreview from "@/components/site/GalleryPreview";
import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "tr" ? "Zarina Hotels — Batum, Gürcistan" : locale === "ka" ? "Zarina Hotels — ბათუმი" : "Zarina Hotels — Batumi, Georgia",
    description: "Spa, Turkish hamam, restaurant and 73 rooms in the heart of Batumi. Book direct for the best available rate.",
    alternates: { canonical: `/${locale}` },
  };
}

const WHY_DIRECT = [
  { icon: "◆", en: "Best available direct rate", tr: "En iyi doğrudan fiyat", ka: "საუკეთესო პირდაპირი ფასი" },
  { icon: "◇", en: "Secure booking, instant confirmation", tr: "Güvenli rezervasyon, anında onay", ka: "უსაფრთხო ჯავშანი" },
  { icon: "◆", en: "Exclusive direct-only offers", tr: "Sadece sitemize özel fırsatlar", ka: "ექსკლუზიური შეთავაზებები" },
  { icon: "◇", en: "Direct support from our team, 24/7", tr: "7/24 doğrudan destek", ka: "24/7 მხარდაჭერა" },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const hotels = await db.hotel.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      translations: { where: { locale } },
      images: { where: { isFeatured: true }, take: 1 },
      rooms: { where: { isActive: true, isFeatured: true }, include: { images: { take: 1, orderBy: { sortOrder: "asc" } } }, take: 3 },
    },
  });

  const featuredRooms = hotels.flatMap((h) => h.rooms.map((r) => ({ hotel: h, room: r }))).slice(0, 3);

  const hotelOptions = hotels.map((h) => ({ id: h.id, name: h.translations[0]?.name ?? h.name, city: h.city }));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "Zarina Hotels",
    slogan: "All in Georgia",
    telephone: "+995 511 24 92 92",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Tsminda Severiani Adjareli St 11",
      addressLocality: "Batumi",
      postalCode: "6000",
      addressCountry: "GE",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Spa" },
      { "@type": "LocationFeatureSpecification", name: "Turkish hammam" },
      { "@type": "LocationFeatureSpecification", name: "Sauna" },
      { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi" },
      { "@type": "LocationFeatureSpecification", name: "Restaurant" },
    ],
    checkinTime: "14:00",
    checkoutTime: "12:00",
    petsAllowed: false,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      {/* HERO — compact OTA banner; search bar pulled up over the banner edge */}
      <div className="relative overflow-x-clip">
        <section className="relative isolate overflow-hidden bg-ink pb-20 sm:pb-24">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/zarina/web/hamam-indoor-pool.webp"
              alt="Zarina Hotels Batumi — 24/7 Turkish hamam with heated marble göbek taşı and gold dome ceiling"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-80 animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B3B]/85 via-[#0B1B3B]/55 to-transparent" />
          </div>
          <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20 lg:pt-24">
            <p className="kicker !text-gold-300 reveal">{dict.home.heroKicker}</p>
            <h1 className="reveal mt-3 max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
              {dict.home.heroTitle}
            </h1>
            <p className="reveal mt-4 max-w-xl text-base leading-7 text-white/85" style={{ "--reveal-delay": "240ms" } as React.CSSProperties}>{dict.home.heroSubtitle}</p>
          </div>
        </section>
        {/* Search bar overlaps the banner's bottom edge */}
        <div id="book" className="relative z-10 mx-auto -mt-12 max-w-7xl px-5 sm:px-8">
          <div className="reveal reveal-zoom">
            <BookingWidget locale={locale} dict={dict} hotels={hotelOptions} />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="h-10" />

      {/* PROPERTIES */}
      <section className="section-pad" aria-labelledby="properties-title">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <p className="kicker">{dict.home.propertiesKicker}</p>
            <h2 id="properties-title" className="section-title mt-2 inline-block">
              <span className="reveal-line pb-1">{dict.home.propertiesTitle}</span>
            </h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {hotels.map((hotel, i) => {
              const t = hotel.translations[0];
              const img = hotel.images[0];
              return (
                <article key={hotel.id} className="reveal group card overflow-hidden card-hover" style={{ "--reveal-delay": `${i * 120}ms` } as React.CSSProperties}>
                  <div className="relative aspect-[16/10]">
                    {img ? (
                      <Image src={img.url} alt={img.alt ?? `${hotel.name} — ${hotel.city}`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-sand-100 text-xs uppercase tracking-widest2 text-ink-muted">PLACEHOLDER — official media pending</div>
                    )}
                    {hotel.isDemo && <span className="badge-demo absolute left-3 top-3">{dict.common.demoData}</span>}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest2 text-ink-muted">{hotel.city}, Georgia</p>
                    <h3 className="mt-1 font-display text-xl font-bold">{t?.name ?? hotel.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{t?.description ?? hotel.description}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs text-ink-muted">{dict.common.from}</p>
                        <p className="font-display text-2xl font-bold text-ink">
                          {formatMoney(Number(hotel.rooms[0]?.basePrice ?? 0))}
                          <span className="text-sm font-medium text-ink-muted"> {dict.common.perNight}</span>
                        </p>
                      </div>
                      <Link href={`/${locale}/booking/search?hotel=${hotel.id}`} className="btn-primary whitespace-nowrap !px-4 !py-2.5 text-sm">{dict.common.checkAvailability}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {hotels.length === 0 && (
              <p className="text-sm text-ink-muted">Properties are being prepared — NEEDS ADMIN VERIFICATION.</p>
            )}
          </div>
        </div>
      </section>

      {/* WHY BOOK DIRECT */}
      <section className="mt-16 border-y border-sand-200 bg-sand-50 section-pad" aria-labelledby="why-title">          <div className="reveal">
            <p className="kicker">{dict.home.whyKicker}</p>
            <h2 id="why-title" className="section-title mt-2">{dict.home.whyTitle}</h2>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_DIRECT.map((w, i) => (
              <li key={w.en} className="reveal card-hover border border-sand-200 bg-white p-6 transition-all duration-500 hover:border-gold-300 hover:shadow-lift" style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}>
                <span className="text-2xl text-gold-500" aria-hidden="true">{w.icon}</span>
                <p className="mt-3 font-medium">{locale === "tr" ? w.tr : locale === "ka" ? w.ka : w.en}</p>
              </li>
            ))}
          </ul>
      </section>

      {/* FEATURED ROOMS */}
      {featuredRooms.length > 0 && (
        <section className="section-pad" aria-labelledby="rooms-title">
          <div className="mx-auto max-w-7xl">
            <div className="reveal">
              <p className="kicker">Stay</p>
              <h2 id="rooms-title" className="section-title mt-2">{dict.home.featuredRoomsTitle}</h2>
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {featuredRooms.map(({ hotel, room }, i) => (
                <article key={room.id} className="reveal card-hover group card overflow-hidden" style={{ "--reveal-delay": `${i * 120}ms` } as React.CSSProperties}>
                  <div className="relative aspect-[4/3]">
                    {room.images[0] ? (
                      <Image src={room.images[0].url} alt={room.images[0].alt ?? room.name} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-sand-100 text-xs uppercase tracking-widest2 text-ink-muted">PLACEHOLDER</div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest2 text-ink-muted">{hotel.name}</p>
                    <h3 className="mt-1 font-display text-lg font-bold">{room.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{room.shortDescription}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="font-display text-xl font-bold text-ink">
                        {formatMoney(Number(room.basePrice))}
                        <span className="text-xs font-medium text-ink-muted"> {dict.common.perNight}</span>
                      </p>
                      <Link href={`/${locale}/hotels/${hotel.slug}#rooms`} className="btn-ghost !px-3.5 !py-2 text-xs">{dict.common.viewHotel}</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY PREVIEW */}
      <section className="bg-ink section-pad text-cream" aria-labelledby="gallery-title">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <p className="kicker !text-gold-300">Zarina Hotels &amp; Hamam</p>
            <h2 id="gallery-title" className="section-title mt-2">{dict.home.galleryTitle}</h2>
            <p className="mt-3 max-w-xl text-sm text-sand-100/70">{dict.home.gallerySubtitle}</p>
          </div>
          <GalleryPreview locale={locale} />
        </div>
      </section>

      {/* GEORGIA */}
      <section className="border-t border-sand-200 bg-sand-50 section-pad" aria-labelledby="georgia-title">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker">Georgia</p>
          <h2 id="georgia-title" className="mt-2 font-display text-3xl sm:text-4xl">{dict.home.georgiaTitle}</h2>
          <p className="mt-5 leading-7 text-ink-soft">{dict.home.georgiaBody}</p>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="section-pad" aria-labelledby="nl-title">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="nl-title" className="font-display text-3xl">{dict.home.newsletterTitle}</h2>
          <p className="mt-3 text-sm text-ink-muted">{dict.home.newsletterBody}</p>
          <form action={`/${locale}/newsletter/subscribed`} method="get" className="mx-auto mt-6 flex max-w-md">
            <label htmlFor="home-nl" className="sr-only">Email</label>
            <input id="home-nl" name="email" type="email" required placeholder={dict.footer.emailPlaceholder} className="input" />
            <button type="submit" className="btn-primary whitespace-nowrap px-5">{dict.footer.subscribe}</button>
          </form>
        </div>
      </section>
    </>
  );
}
