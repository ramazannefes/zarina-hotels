import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";

export const revalidate = 300;

export default async function OffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const offers = await db.offer.findMany({
    where: { isActive: true, locale },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <p className="kicker">{dict.home.offersTitle}</p>
      <h1 className="mt-2 font-display text-4xl">{dict.home.offersTitle}</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {offers.map((o, i) => (
          <article key={o.id} className="reveal card-hover relative card flex flex-col p-6 transition-all duration-500 hover:border-gold-300" style={{ "--reveal-delay": `${(i % 3) * 110}ms` } as React.CSSProperties}>
            {o.discountPercent && (
              <span className="absolute -mt-3 inline-block bg-wine-600 px-3 py-1 text-xs uppercase tracking-widest2 text-cream shadow-wine">−{o.discountPercent}%</span>
            )}
            {o.isDemo && <span className="badge-demo mt-2 self-start">{dict.common.demoData}</span>}
            <h2 className="mt-2 font-display text-2xl">{o.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">{o.summary}</p>
            <Link href={`/${locale}/offers/${o.slug}`} className="btn-ghost mt-4 self-start !px-4 !py-2 text-xs">
              {locale === "tr" ? "Fırsatı gör" : "View offer"}
            </Link>
          </article>
        ))}
      </div>
      {offers.length === 0 && <p className="mt-10 text-sm text-ink-muted">No current offers.</p>}
    </div>
  );
}
