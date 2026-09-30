import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = locale === "tr" ? "Olanaklar" : locale === "ka" ? "მოვსახურება" : "Amenities";
  return {
    title: `${t} — Zarina Hotels & Hamam, Batumi`,
    description: "Spa ve sağlık merkezi, restoran, ücretsiz otopark, Wi-Fi, havaalanı servisi — Zarina Hotels & Hamam olanakları.",
    alternates: { canonical: `/${locale}/amenities` },
  };
}

type Amenity = { icon: string; tr: string; en: string; ka: string };

const POPULAR: Amenity[] = [
  { icon: "✈", tr: "Havaalanı servisi", en: "Airport shuttle", ka: "აეროპორტის ტრანსფერი" },
  { icon: "🚭", tr: "Sigara içilmeyen odalar", en: "Non-smoking rooms", ka: "მოწევის გარეშე ოთახები" },
  { icon: "📶", tr: "Ücretsiz Wi-Fi", en: "Free Wi-Fi", ka: "უფასო Wi-Fi" },
  { icon: "👨‍👩‍👧", tr: "Aile odaları", en: "Family rooms", ka: "ოჯახური ოთახები" },
  { icon: "♿", tr: "Engelli konuklar için olanaklar", en: "Facilities for disabled guests", ka: "შეზღუდული შესაძლებლობების მქონე სტუმრებისთვის" },
  { icon: "🅿", tr: "Ücretsiz otopark", en: "Free parking", ka: "უფასო პარკირება" },
  { icon: "🍽", tr: "Restoran", en: "Restaurant", ka: "რესტორანი" },
  { icon: "💆", tr: "Spa ve sağlık merkezi", en: "Spa and wellness centre", ka: "სპა და ჯანმრთელობის ცენტრი" },
];

const GREAT_FOR: Amenity[] = [
  { icon: "🍽", tr: "Restoran", en: "Restaurant", ka: "რესტორანი" },
  { icon: "🅿", tr: "Otopark", en: "Parking", ka: "პარკირება" },
  { icon: "💆", tr: "Spa ve sağlık merkezi", en: "Spa and wellness centre", ka: "სპა და ჯანმრთელობის ცენტრი" },
  { icon: "🌄", tr: "Manzara", en: "View", ka: "ხედი" },
  { icon: "📶", tr: "Ücretsiz Wi-Fi", en: "Free Wi-Fi", ka: "უფასო Wi-Fi" },
  { icon: "❄", tr: "Klima", en: "Air conditioning", ka: "კონდიციონერი" },
  { icon: "🍖", tr: "Barbekü olanakları", en: "BBQ facilities", ka: "ბარბექიუს შესაძლებლობები" },
  { icon: "🅿", tr: "Ücretsiz otopark", en: "Free parking", ka: "უფასო პარკირება" },
];

const BEDROOM: Amenity[] = [
  { icon: "🛏", tr: "Yatak odası", en: "Bedroom", ka: "საძინებელი" },
  { icon: "🚪", tr: "Gardırop veya dolap", en: "Wardrobe or closet", ka: "კარადა ან კაბინა" },
  { icon: "🌄", tr: "Manzara", en: "View", ka: "ხედი" },
];

const OUTDOORS: Amenity[] = [
  { icon: "🌄", tr: "Manzara", en: "View", ka: "ხედი" },
  { icon: "🪑", tr: "Bahçe mobilyası", en: "Garden furniture", ka: "ბაღის ავეჯი" },
  { icon: "☀", tr: "Güneşlenme terası", en: "Sun deck", ka: "მზის ტერასა" },
  { icon: "🍖", tr: "Barbekü olanakları", en: "BBQ facilities", ka: "ბარბექიუს შესაძლებლობები" },
  { icon: "🌿", tr: "Teras", en: "Terrace", ka: "ტერასა" },
];

function Section({ title, items, cols }: { title: string; items: Amenity[]; cols?: string }) {
  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="section-title !text-2xl">{title}</h2>
      <ul className={`mt-6 grid gap-3 ${cols ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        {items.map((a, i) => (
          <li
            key={`${a.tr}-${i}`}
            className="reveal card-hover flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3.5 transition-all duration-500 hover:border-gold-300 hover:shadow-lift"
            style={{ "--reveal-delay": `${(i % 8) * 60}ms` } as React.CSSProperties}
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300/15 text-base text-gold-600">
              {a.icon}
            </span>
            <span className="text-sm font-medium text-ink">{a.tr}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AmenitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const L = (a: Amenity) => (locale === "tr" ? a.tr : locale === "ka" ? a.ka : a.en);
  const tr = locale === "tr";

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <p className="kicker reveal">Zarina Hotels &amp; Hamam</p>
      <h1 className="reveal mt-2 font-display text-4xl">{dict.home.amenitiesTitle}</h1>
      <p className="reveal mt-3 max-w-xl text-sm leading-6 text-ink-muted" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        {dict.home.amenitiesSubtitle}
      </p>

      <section className="mt-12" aria-label={tr ? "En popüler olanaklar" : "Most popular amenities"}>
        <h2 className="section-title !text-2xl">{tr ? "En popüler olanaklar" : "Most popular amenities"}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {POPULAR.map((a, i) => (
            <li
              key={a.tr}
              className="reveal card-hover flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3.5 transition-all duration-500 hover:border-gold-300 hover:shadow-lift"
              style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300/15 text-base text-gold-600">
                {a.icon}
              </span>
              <span className="text-sm font-medium text-ink">{L(a)}</span>
            </li>
          ))}
        </ul>
      </section>

      <Section title={tr ? "Konaklamanız için harika" : "Great for your stay"} items={GREAT_FOR} />
      <Section title={tr ? "Yatak odası" : "Bedroom"} items={BEDROOM} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
      <Section title={tr ? "Açık alan" : "Outdoor area"} items={OUTDOORS} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />

      <p className="mt-10 text-xs text-ink-muted">
        {tr
          ? "Tüm odalarda balkon, klima, düz ekran TV ve ücretsiz Wi-Fi bulunmaktadır."
          : "All rooms come with a balcony, air conditioning, flat-screen TV and free Wi-Fi."}
      </p>
    </div>
  );
}
