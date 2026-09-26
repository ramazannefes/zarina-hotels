import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center sm:px-8">
      <div className="card p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-700" aria-hidden="true">✕</div>
        <h1 className="mt-5 font-display text-3xl">Payment unsuccessful</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          {ref ? (
            <>Your payment for booking <strong>{ref}</strong> could not be completed. Your room remains held for a short time — you can retry payment or contact us for help.</>
          ) : (
            <>Your payment could not be completed. Please try again or contact us.</>
          )}
        </p>
        <p className="mt-2 text-xs text-ink-muted">No charge was made to your card.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {ref && (
            <Link href={`/manage-booking?ref=${encodeURIComponent(ref)}`} className="btn-primary !px-5 !py-2.5 text-xs">
              Retry payment
            </Link>
          )}
          <Link href={`/${locale}/contact`} className="btn-ghost !px-5 !py-2.5 text-xs">Contact us</Link>
        </div>
      </div>
    </div>
  );
}
