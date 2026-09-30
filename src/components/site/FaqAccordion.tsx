"use client";

import { useMemo, useState } from "react";
import { FAQ_ITEMS, FAQ_CATEGORY_LABELS, type FaqCategory } from "@/lib/faq-data";
import type { Locale } from "@/lib/i18n/config";

type Props = { locale: Locale };

const CATS: FaqCategory[] = ["booking", "rooms", "facilities", "policies"];

export default function FaqAccordion({ locale }: Props) {
  const [cat, setCat] = useState<FaqCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const items = useMemo(() => {
    return FAQ_ITEMS.filter((it) => {
      const catOk = cat === "all" || it.category === cat;
      if (!catOk) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        it.q[locale].toLowerCase().includes(q) ||
        it.a[locale].toLowerCase().includes(q)
      );
    });
  }, [cat, query, locale]);

  const label = (cat: FaqCategory) =>
    FAQ_CATEGORY_LABELS[cat][locale === "tr" ? "tr" : locale === "ka" ? "ka" : "en"];

  return (
    <div>
      {/* Arama */}
      <div className="relative">
        <label htmlFor="faq-search" className="sr-only">Ara</label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={locale === "tr" ? "Soru ara…" : locale === "ka" ? "მოძებნე…" : "Search questions…"}
          className="input !py-3 pr-11"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      {/* Kategori çipleri */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="SSS kategorileri">
        <button
          type="button"
          role="tab"
          aria-selected={cat === "all"}
          onClick={() => { setCat("all"); setOpen(null); }}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest2 transition-all duration-300 ${
            cat === "all" ? "border-gold-500 bg-gold-500 text-white shadow-lift" : "border-sand-300 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-600"
          }`}
        >
          {locale === "tr" ? "Tümü" : locale === "ka" ? "ყველა" : "All"}
        </button>
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            onClick={() => { setCat(c); setOpen(null); }}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest2 transition-all duration-300 ${
              cat === c ? "border-gold-500 bg-gold-500 text-white shadow-lift" : "border-sand-300 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-600"
            }`}
          >
            {label(c)}
          </button>
        ))}
      </div>

      {/* Akordeon */}
      <div className="mt-8 space-y-3">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div
              key={it.q.en}
              className={`overflow-hidden rounded-xl border bg-white transition-all duration-500 ${
                isOpen ? "border-gold-400 shadow-lift" : "border-sand-200 hover:border-gold-300"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest2 sm:inline ${
                      isOpen ? "bg-gold-500 text-white" : "bg-gold-300/15 text-gold-600"
                    }`}
                  >
                    {label(it.category)}
                  </span>
                  <span className="font-medium text-ink">{it.q[locale]}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                    isOpen ? "rotate-45 bg-gold-500 text-white" : "bg-sand-100 text-gold-600"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <div
                id={`faq-panel-${i}`}
                className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                role="region"
              >
                <div className="overflow-hidden">
                  <p className="border-t border-sand-100 px-5 pb-5 pt-4 text-sm leading-7 text-ink-soft">
                    {it.a[locale]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-muted">
            {locale === "tr" ? "Sonuç bulunamadı." : locale === "ka" ? "შედეგი ვერ მოიძებნა." : "No results found."}
          </p>
        )}
      </div>
    </div>
  );
}
