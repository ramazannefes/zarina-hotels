import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="kicker">{dict.nav.about}</p>
      <h1 className="mt-2 font-display text-4xl">Zarina Hotels — All in Georgia</h1>

      <div className="mt-8 space-y-5 leading-8 text-ink-soft">
        <p>
          Zarina Hotels welcomes guests in Batumi, on Georgia's Black Sea coast. Our house pairs
          the country's deep tradition of hospitality with the rituals of the Turkish hamam —
          kese, foam massage and rest — available around the clock.
        </p>
        <p>
          73 rooms, a restaurant, a lobby bar, spa and sauna, conference and banquet spaces, free
          valet parking and a team that speaks English, Turkish, Georgian, Russian and Arabic.
        </p>
        <p className="text-sm text-ink-muted">
          Our story is being written together with the owners — this page will grow with verified
          brand content. NEEDS ADMIN VERIFICATION.
        </p>
      </div>

      <dl className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="card p-5 text-center">
          <dt className="kicker">Rooms</dt>
          <dd className="mt-1 font-display text-3xl">73</dd>
        </div>
        <div className="card p-5 text-center">
          <dt className="kicker">Front desk</dt>
          <dd className="mt-1 font-display text-3xl">24/7</dd>
        </div>
        <div className="card p-5 text-center">
          <dt className="kicker">Hamam & Spa</dt>
          <dd className="mt-1 font-display text-3xl">7/24</dd>
        </div>
      </dl>
    </div>
  );
}
