import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  const legal = [
    { href: `/${locale}/privacy`, label: "Privacy Policy" },
    { href: `/${locale}/cookies`, label: "Cookie Policy" },
    { href: `/${locale}/terms`, label: "Terms & Conditions" },
    { href: `/${locale}/booking-terms`, label: "Booking Terms" },
    { href: `/${locale}/cancellation-policy`, label: "Cancellation Policy" },
  ];
  const company = [
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
    { href: `/${locale}/faq`, label: "FAQ" },
    { href: `/${locale}/journal`, label: "Journal" },
    { href: `/${locale}/gallery`, label: "Gallery" },
  ];

  return (
    <footer className="border-t border-sand-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-gradient font-display text-sm font-bold text-white">Z</span>
            <span className="font-display text-xl font-extrabold text-gold-600">Zarina</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest2 text-ink-muted">Hotels · All in Georgia</p>
          <address className="mt-4 text-sm not-italic leading-6 text-ink-soft">
            Tsminda Severiani Adjareli St 11, Batumi 6000, Georgia
            <br />
            <a href="tel:+995511249292" className="font-medium text-gold-600 hover:underline">+995 511 24 92 92</a>
          </address>
          <p className="mt-3 text-xs text-ink-muted">Front desk 24/7 · Check-in 14:00 · Check-out 12:00</p>
        </div>
        <nav aria-label="Properties and company">
          <h3 className="text-xs font-bold uppercase tracking-widest2 text-ink">{dict.footer.properties}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={`/${locale}/hotels/zarina-batumi`} className="text-ink-soft hover:text-gold-600 hover:underline">Zarina Hotels Batumi</Link></li>
          </ul>
          <h3 className="mt-6 text-xs font-bold uppercase tracking-widest2 text-ink">{dict.footer.company}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {company.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-ink-soft hover:text-gold-600 hover:underline">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h3 className="text-xs font-bold uppercase tracking-widest2 text-ink">{dict.footer.legal}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {legal.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-ink-soft hover:text-gold-600 hover:underline">{l.label}</Link></li>
            ))}
            <li><Link href="/sitemap.xml" className="text-ink-soft hover:text-gold-600 hover:underline">Sitemap</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest2 text-ink">{dict.footer.newsletter}</h3>
          <p className="mt-3 text-sm text-ink-soft">Seasonal offers and Georgia travel notes.</p>
          <form action={`/${locale}/newsletter/subscribed`} method="get" className="mt-4 flex gap-2">
            <label htmlFor="nl-email" className="sr-only">Email</label>
            <input id="nl-email" name="email" type="email" required placeholder={dict.footer.emailPlaceholder}
              className="input !py-2.5" />
            <button type="submit" className="btn-primary whitespace-nowrap !px-4 !py-2.5 text-xs">
              {dict.footer.subscribe}
            </button>
          </form>
          <p className="mt-3 text-[11px] text-ink-muted">
            By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
          <div className="mt-5 flex gap-4 text-sm font-medium">
            <a href="https://instagram.com/zarina_hotels_group" target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:underline">Instagram</a>
          </div>
        </div>
      </div>
      <div className="border-t border-sand-200 bg-sand-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-ink-muted sm:flex-row sm:px-8">
          <p>© {year} Zarina Hotels. {dict.footer.rights}</p>
          <p>Secure payments · PCI-compliant provider · Direct booking support</p>
        </div>
      </div>
    </footer>
  );
}
