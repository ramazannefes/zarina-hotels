"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export default function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${locale}/hotels`, label: dict.nav.hotels },
    { href: `/${locale}/gallery`, label: dict.nav.gallery },
    { href: `/${locale}/amenities`, label: dict.nav.amenities },
    { href: `/${locale}/faq`, label: dict.nav.faq },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];
  const otherLocales = (
    [
      { code: "en", label: "EN" },
      { code: "ka", label: "ქარ" },
      { code: "tr", label: "TR" },
    ] as const
  ).filter((l) => l.code !== locale);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-card" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2" aria-label="Zarina Hotels home">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient font-display text-base font-bold text-white">Z</span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-extrabold tracking-tight text-gold-600">Zarina</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest2 text-ink-muted">Hotels · Batumi</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sea-100 hover:text-gold-600"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 text-xs sm:flex" aria-label="Language">
            {otherLocales.map((l) => (
              <Link key={l.code} href={`/${l.code}`} className="rounded-full px-2 py-1.5 font-semibold text-ink-soft hover:bg-sea-100 hover:text-gold-600" lang={l.code}>
                {l.label}
              </Link>
            ))}
          </div>
          <Link href={`/${locale}/manage-booking`} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-sea-100 hover:text-gold-600 md:block">
            {dict.nav.manageBooking}
          </Link>
          <Link href={`/${locale}/booking/search`} className="btn-primary whitespace-nowrap !px-4 !py-2 text-sm">
            {dict.common.bookNow}
          </Link>
          <details className="relative lg:hidden">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-sand-300 hover:bg-sea-100" aria-label="Open menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-sand-200 bg-white p-2 shadow-lift">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-sea-100">
                  {l.label}
                </Link>
              ))}
              <Link href={`/${locale}/manage-booking`} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-sea-100">
                {dict.nav.manageBooking}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
