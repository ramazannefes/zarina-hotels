import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = locale === "tr" ? "Olanaklar" : locale === "ka" ? "მომსახურება" : "Amenities";
  return {
    title: `${t} — Zarina Hotels & Hamam, Batumi`,
    description:
      locale === "tr"
        ? "Spa ve sağlık merkezi, restoran, ücretsiz otopark, Wi-Fi, havaalanı servisi — Zarina Hotels & Hamam olanakları."
        : "Spa and wellness centre, restaurant, free parking, Wi-Fi, airport shuttle — amenities at Zarina Hotels & Hamam.",
    alternates: { canonical: `/${locale}/amenities` },
  };
}

type Amenity = { icon: string; tr: string; en: string; ka: string };

/** En popüler olanaklar (referans site) */
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

/** Konaklamanız için harika — popülerde olmayanlar + temel konfor */
const GREAT_FOR: Amenity[] = [
  { icon: "❄", tr: "Klima", en: "Air conditioning", ka: "კონდიციონერი" },
  { icon: "🌄", tr: "Manzara", en: "View", ka: "ხედი" },
  { icon: "🛁", tr: "Özel banyo", en: "Private bathroom", ka: "პირადი აბაზანა" },
  { icon: "🪟", tr: "Balkon", en: "Balcony", ka: "აივანი" },
  { icon: "📺", tr: "Düz ekran TV", en: "Flat-screen TV", ka: "ბრტყელეკრანიანი ტელევიზორი" },
  { icon: "🧖", tr: "Hamam & sıcak havuz", en: "Hamam & hot tub", ka: "აბანო & ცხარე აუზი" },
];

/** Yatak odası */
const BEDROOM: Amenity[] = [
  { icon: "🛏", tr: "Konforlu yataklar", en: "Comfortable beds", ka: "კომფორტული საწოლები" },
  { icon: "🚪", tr: "Gardırop veya dolap", en: "Wardrobe or closet", ka: "კარადა ან კაბინა" },
  { icon: "🧺", tr: "Çamaşır makinesi", en: "Washing machine", ka: "სარეცხი მანქანა" },
];

/** Açık alan */
const OUTDOORS: Amenity[] = [
  { icon: "🪑", tr: "Bahçe mobilyası", en: "Garden furniture", ka: "ბაღის ავეჯი" },
  { icon: "☀", tr: "Güneşlenme terası", en: "Sun deck", ka: "მზის ტერასა" },
  { icon: "🍖", tr: "Barbekü olanakları", en: "BBQ facilities", ka: "ბარბექიუს შესაძლებლობები" },
  { icon: "🌿", tr: "Bahçe", en: "Garden", ka: "ბაღი" },
  { icon: "🌇", tr: "Teras", en: "Terrace", ka: "ტერასა" },
];

function AmenityCard({ a, label }: { a: Amenity; label: string }) {
  return (
    <li className="reveal card-hover flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3.5 transition-all duration-500 hover:border-gold-300 hover:shadow-lift">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300/15 text-base text-gold-600"
      >
        {a.icon}
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
    </li>
  );
}

export default async function AmenitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const L = (a: Amenity) => (locale === "tr" ? a.tr : locale === "ka" ? a.ka : a.en);
  const titles = {
    popular: locale === "tr" ? "En popüler olanaklar" : locale === "ka" ? "ყველაზე პოპულარული" : "Most popular amenities",
    great: locale === "tr" ? "Konaklamanız için harika" : locale === "ka" ? "დარჩენისთვის შესანიშნავი" : "Great for your stay",
    bedroom: locale === "tr" ? "Yatak odası" : locale === "ka" ? "საძინებელი" : "Bedroom",
    outdoors: locale === "tr" ? "Açık alan" : locale === "ka" ? "ღია სივრცე" : "Outdoor area",
  };
  const footnote =
    locale === "tr"
      ? "Tüm odalarda balkon, klima, düz ekran TV ve ücretsiz Wi-Fi bulunmaktadır."
      : locale === "ka"
        ? "ყველა ოთახში არის აივანი, კონდიციონერი, ბრტყელეკრანიანი ტელევიზორი და უფასო Wi-Fi."
        : "All rooms come with a balcony, air conditioning, flat-screen TV and free Wi-Fi.";

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <p className="kicker reveal">Zarina Hotels &amp; Hamam</p>
      <h1 className="reveal mt-2 font-display text-4xl">{dict.home.amenitiesTitle}</h1>
      <p
        className="reveal mt-3 max-w-xl text-sm leading-6 text-ink-muted"
        style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
      >
        {dict.home.amenitiesSubtitle}
      </p>

      <section className="mt-12" aria-label={titles.popular}>
        <h2 className="section-title !text-2xl">{titles.popular}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {POPULAR.map((a) => (
            <AmenityCard key={a.tr} a={a} label={L(a)} />
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-label={titles.great}>
        <h2 className="section-title !text-2xl">{titles.great}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GREAT_FOR.map((a) => (
            <AmenityCard key={a.tr} a={a} label={L(a)} />
          ))}
        </ul>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-label={titles.bedroom}>
          <h2 className="section-title !text-2xl">{titles.bedroom}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3">
            {BEDROOM.map((a) => (
              <AmenityCard key={a.tr} a={a} label={L(a)} />
            ))}
          </ul>
        </section>
        <section aria-label={titles.outdoors}>
          <h2 className="section-title !text-2xl">{titles.outdoors}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3">
            {OUTDOORS.map((a) => (
              <AmenityCard key={a.tr} a={a} label={L(a)} />
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-10 border-t border-sand-200 pt-6 text-xs text-ink-muted">{footnote}</p>
    </div>
  );
}
