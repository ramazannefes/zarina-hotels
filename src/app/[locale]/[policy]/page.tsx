import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { db } from "@/lib/db";

const POLICIES: Record<string, { title: string; fallback: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    fallback: [
      "Zarina Hotels processes personal data (name, contact details, booking information) solely to manage reservations and comply with legal obligations.",
      "We never store card numbers — payments are handled by PCI-compliant providers.",
      "DATA PLACEHOLDER — final legal wording MUST be reviewed and published by the hotel administrator before production launch.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    fallback: [
      "Necessary cookies keep booking flows and security working. Analytics and marketing cookies load only after your consent.",
      "DATA PLACEHOLDER — final legal wording MUST be reviewed by the hotel administrator.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    fallback: ["DATA PLACEHOLDER — Terms & Conditions must be provided by Zarina Hotels management. NEEDS ADMIN VERIFICATION."],
  },
  "booking-terms": {
    title: "Booking Terms",
    fallback: [
      "Bookings are held for 15 minutes during payment. Confirmation follows verified payment via our provider's webhook.",
      "DATA PLACEHOLDER — full booking terms pending admin verification.",
    ],
  },
  "cancellation-policy": {
    title: "Cancellation Policy",
    fallback: [
      "Cancellation terms depend on your rate plan. Flexible plans can be cancelled free of charge up to the deadline shown at checkout; non-refundable plans are not refundable.",
      "DATA PLACEHOLDER — official cancellation policy NEEDS ADMIN VERIFICATION.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; policy: string }> }): Promise<Metadata> {
  const { policy } = await params;
  const def = POLICIES[policy];
  return def ? { title: def.title } : {};
}

export function generateStaticParams() {
  return Object.keys(POLICIES).map((policy) => ({ policy }));
}

export default async function PolicyPage({ params }: { params: Promise<{ locale: string; policy: string }> }) {
  const { locale, policy } = await params;
  if (!isLocale(locale)) notFound();
  const def = POLICIES[policy];
  if (!def) notFound();

  const block = await db.contentBlock.findUnique({
    where: { key_locale: { key: `policy.${policy}`, locale } },
  });

  const paragraphs = block
    ? block.value.split("\n").filter(Boolean)
    : def.fallback;

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-4xl">{def.title}</h1>
      {!block && (
        <p className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-xs uppercase tracking-widest2 text-amber-800">
          NEEDS ADMIN VERIFICATION — default placeholder text shown. Editable in Admin → Content.
        </p>
      )}
      <div className="mt-8 space-y-4 leading-7 text-ink-soft">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
