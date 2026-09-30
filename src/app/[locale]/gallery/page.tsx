import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import GalleryGrid from "@/components/site/GalleryGrid";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = locale === "tr" ? "Galeri" : locale === "ka" ? "გალერეა" : "Gallery";
  return {
    title: `${t} — Zarina Hotels & Hamam, Batumi`,
    description: "Spa, hamam, odalar, lobi ve restoran — Zarina Hotels & Hamam fotoğraf galerisi.",
    alternates: { canonical: `/${locale}/gallery` },
  };
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <p className="kicker reveal">Zarina Hotels &amp; Hamam</p>
      <h1 className="reveal mt-2 font-display text-4xl">{dict.home.galleryTitle}</h1>
      <p className="reveal mt-3 max-w-xl text-sm leading-6 text-ink-muted" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        {dict.home.gallerySubtitle}
      </p>
      <div className="reveal mt-10" style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
        <GalleryGrid locale={locale} />
      </div>
    </div>
  );
}
