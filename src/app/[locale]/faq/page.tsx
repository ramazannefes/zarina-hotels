import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { FAQ_ITEMS } from "@/lib/faq-data";
import FaqAccordion from "@/components/site/FaqAccordion";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zarina-hotels.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t =
    locale === "tr"
      ? { title: "Sık Sorulan Sorular", desc: "Giriş-çıkış saatleri, iptal koşulları, otopark, havaalanı servisi, evcil hayvan ve daha fazlası — Zarina Hotels & Hamam SSS." }
      : locale === "ka"
        ? { title: "ხშირად დასმული კითხვები", desc: "ჩასვლა-გასვლის დრო, გაუქმების პირობები, პარკირება — Zarina Hotels & Hamam კითხვები." }
        : { title: "Frequently Asked Questions", desc: "Check-in times, cancellation terms, parking, airport shuttle, pets and more — Zarina Hotels & Hamam FAQ." };
  return {
    title: `${t.title} — Zarina Hotels & Hamam, Batumi`,
    description: t.desc,
    alternates: { canonical: `/${locale}/faq` },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const title =
    locale === "tr" ? "Sık Sorulan Sorular" : locale === "ka" ? "ხშირად დასმული კითხვები" : "Frequently Asked Questions";
  const subtitle =
    locale === "tr"
      ? "Cevabını bulamadığınız bir soru mu var? Bize 7/24 ulaşabilirsiniz."
      : locale === "ka"
        ? "ვერ იპოვეთ პასუხი? დაგვიკავშირდით 24/7."
        : "Can't find your answer? Reach us any time, 24/7.";

  // Google FAQPage schema — sadece soru/cevap çiftleri
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((it) => ({
      "@type": "Question",
      name: it.q[locale],
      acceptedAnswer: { "@type": "Answer", text: it.a[locale] },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <p className="kicker reveal">Zarina Hotels &amp; Hamam</p>
        <h1 className="reveal mt-2 font-display text-4xl">{title}</h1>
        <p
          className="reveal mt-3 max-w-xl text-sm leading-6 text-ink-muted"
          style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
        >
          {subtitle}{" "}
          <a href={`/${locale}/contact`} className="link-underline font-medium text-gold-600">
            {dict.nav.contact}
          </a>
        </p>
        <div className="reveal mt-10" style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
          <FaqAccordion locale={locale} />
        </div>
      </div>
    </>
  );
}
