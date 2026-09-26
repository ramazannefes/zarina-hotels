import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { db } from "@/lib/db";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offer = await db.offer.findUnique({ where: { slug } });
  return offer ? { title: offer.title, description: offer.summary.slice(0, 160) } : {};
}

export default async function OfferDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const offer = await db.offer.findUnique({ where: { slug }, include: { hotel: { select: { name: true, slug: true, id: true } } } });
  if (!offer || !offer.isActive || offer.locale !== locale) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      {offer.isDemo && <span className="badge-demo">DEMO DATA</span>}
      <h1 className="mt-3 font-display text-4xl">{offer.title}</h1>
      {offer.discountPercent && <p className="mt-2 font-display text-4xl text-wine-600">−{offer.discountPercent}%</p>}
      <p className="mt-4 text-lg leading-8 text-ink-soft">{offer.summary}</p>
      <div className="mt-6 space-y-4 leading-7 text-ink-soft">
        {offer.body.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {offer.promoCode && (
        <p className="mt-6 border border-dashed border-gold-400 bg-gold-300/5 px-4 py-3 text-sm">
          Promo code: <strong className="tracking-widest2">{offer.promoCode}</strong> — enter at checkout.
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Link href={`/${locale}/booking/search${offer.hotel ? `?hotel=${offer.hotel.id}` : ""}`} className="btn-primary !px-5 !py-2.5 text-xs">
          Book this offer
        </Link>
        <Link href={`/${locale}/offers`} className="btn-ghost !px-5 !py-2.5 text-xs">All offers</Link>
      </div>
    </article>
  );
}
