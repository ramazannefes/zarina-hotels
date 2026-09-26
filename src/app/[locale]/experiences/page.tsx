import { notFound } from "next/navigation";
import Image from "next/image";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";

export const revalidate = 300;

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const experiences = await db.hotelExperience.findMany({
    where: { isActive: true, locale },
    orderBy: { sortOrder: "asc" },
    include: { hotel: { select: { name: true, slug: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <p className="kicker">{dict.home.experiencesTitle}</p>
      <h1 className="mt-2 font-display text-4xl">{dict.home.experiencesTitle}</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {experiences.map((e, i) => (
          <article key={e.id} className="reveal card-hover card overflow-hidden" style={{ "--reveal-delay": `${(i % 3) * 110}ms` } as React.CSSProperties}>
            {e.imageUrl ? (
              <div className="relative aspect-[4/3]">
                <Image src={e.imageUrl} alt={e.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 hover:scale-105" />
              </div>
            ) : null}
            <div className="p-6">
              <h2 className="font-display text-xl text-gold-600">{e.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{e.description}</p>
              <p className="mt-3 text-xs uppercase tracking-widest2 text-ink-muted">{e.hotel.name}</p>
            </div>
          </article>
        ))}
      </div>
      {experiences.length === 0 && (
        <p className="mt-10 text-sm text-ink-muted">Experiences are being curated — NEEDS ADMIN VERIFICATION.</p>
      )}
    </div>
  );
}
