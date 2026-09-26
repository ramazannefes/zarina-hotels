import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import ContactForm from "@/components/site/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const hotels = await db.hotel.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true, phone: true, email: true, address: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="kicker">{dict.nav.contact}</p>
      <h1 className="mt-2 font-display text-4xl">We're here to help</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Questions about your stay, group bookings or spa reservations — our front desk answers around the clock.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ContactForm locale={locale} hotels={hotels.map((h) => ({ id: h.id, name: `${h.name} — ${h.city}` }))} />

        <aside className="space-y-6">
          {hotels.map((h) => (
            <div key={h.id} className="card p-6">
              <h2 className="font-display text-xl">{h.name}</h2>
              <address className="mt-2 text-sm not-italic leading-6 text-ink-muted">
                {h.address}<br />{h.city}, Georgia
              </address>
              {h.phone && <p className="mt-2 text-sm"><a href={`tel:${h.phone.replace(/\s/g, "")}`} className="link-underline">{h.phone}</a></p>}
              {h.email && <p className="text-sm"><a href={`mailto:${h.email}`} className="link-underline">{h.email}</a></p>}
            </div>
          ))}
          <div className="card bg-sand-50 p-6 text-sm text-ink-muted">
            <p className="font-medium text-ink">Reception hours</p>
            <p className="mt-1">24/7 · Check-in from 14:00 · Check-out until 12:00</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
