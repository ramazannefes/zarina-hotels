"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { GALLERY_ITEMS, GALLERY_CATEGORY_LABELS, type GalleryCategory, type GalleryItem } from "@/lib/gallery-data";
import type { Locale } from "@/lib/i18n/config";

type Props = { locale: Locale };

const CATS: Array<GalleryCategory | "all"> = ["all", "spa", "rooms", "dining", "lobby"];

export default function GalleryGrid({ locale }: Props) {
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = GALLERY_ITEMS.filter((it) => filter === "all" || it.category === filter);

  const labelOf = (it: GalleryItem) =>
    locale === "tr" ? it.labelTr : locale === "ka" ? it.labelKa : it.labelEn;

  const close = useCallback(() => setLightbox(null), []);

  const step = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => (cur === null ? null : (cur + dir + items.length) % items.length));
    },
    [items.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, step]);

  return (
    <div>
      {/* Filtre çipleri */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Galeri filtreleri">
        {CATS.map((c) => {
          const active = filter === c;
          const lbl =
            c === "all"
              ? GALLERY_CATEGORY_LABELS.all[locale === "tr" ? "tr" : locale === "ka" ? "ka" : "en"]
              : GALLERY_CATEGORY_LABELS[c][locale === "tr" ? "tr" : locale === "ka" ? "ka" : "en"];
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilter(c);
                setLightbox(null);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest2 transition-all duration-300 ${
                active
                  ? "border-gold-500 bg-gold-500 text-white shadow-lift"
                  : "border-sand-300 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-600"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Masonry grid */}
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {items.map((it, i) => (
          <button
            key={it.src}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative block w-full overflow-hidden rounded-xl border border-sand-200 bg-sand-100 shadow-card transition-all duration-500 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
            aria-label={`${labelOf(it)} — büyüt`}
          >
            <div className={`relative w-full ${it.size === "tall" ? "aspect-[3/4]" : it.size === "wide" ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
              <Image
                src={it.src}
                alt={labelOf(it)}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              {/* Alt bilgi şeridi — etiket */}
              <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent px-4 pb-3 pt-10 text-left opacity-90 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="font-display text-sm font-semibold text-white">{labelOf(it)}</p>
              </div>
              {/* Büyüt ikonu */}
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-card transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 10.5 14 14M7 5.5v3M5.5 7h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-10 text-sm text-ink-muted">Bu kategoride fotoğraf bulunamadı.</p>
      )}

      {/* Lightbox */}
      {lightbox !== null && items[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labelOf(items[lightbox])}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Kapat"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
            aria-label="Önceki"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
            aria-label="Sonraki"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <figure className="max-h-[85vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[70vh] w-full sm:h-[75vh]">
              <Image
                src={items[lightbox].src}
                alt={labelOf(items[lightbox])}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <figcaption className="mt-3 text-center font-display text-lg font-semibold text-white">
              {labelOf(items[lightbox])}
              <span className="ml-3 text-xs font-normal text-white/60">
                {lightbox + 1} / {items.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
