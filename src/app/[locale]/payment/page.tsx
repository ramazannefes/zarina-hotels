import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/db";
import { formatMoney, formatDateHuman } from "@/lib/money";
import { getPaymentProvider } from "@/lib/payments";
import PaymentPanel from "@/components/booking/PaymentPanel";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const bookingId = typeof sp.booking === "string" ? sp.booking : "";
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      hotel: { select: { name: true } },
      rooms: { include: { roomType: { select: { name: true } } } },
      guest: { select: { email: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!booking || booking.reference !== ref) notFound();
  // Only unpaid, active holds can be paid
  if (!["HOLDING", "PENDING_PAYMENT"].includes(booking.status)) notFound();

  const provider = getPaymentProvider();
  const idempotencyKey = `pi_${booking.id}_${Date.now().toString(36)}`;
  const intent = await provider.createIntent({
    bookingId: booking.id,
    amount: Number(booking.grandTotal),
    currency: "GEL",
    idempotencyKey,
    description: `Zarina Hotels ${booking.reference}`,
    callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/webhook`,
    failUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/payment/failed?ref=${booking.reference}`,
  });

  const payment = booking.payments[0];
  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: intent.providerPaymentId, idempotencyKey },
    });
  } else {
    await db.payment.create({
      data: {
        bookingId: booking.id,
        provider: provider.name,
        providerPaymentId: intent.providerPaymentId,
        idempotencyKey,
        amount: booking.grandTotal,
        currency: "GEL",
        status: "PENDING",
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <ol className="mb-10 flex flex-wrap gap-3 text-xs uppercase tracking-widest2 text-ink-muted" aria-label="Checkout progress">
        <li>1 · Room</li>
        <li>2 · Extras</li>
        <li>3 · Guest details</li>
        <li className="font-medium text-gold-600" aria-current="step">4 · Payment</li>
        <li>5 · Confirmation</li>
      </ol>

      <div className="card p-8">
        <h1 className="font-display text-3xl">Secure payment</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {booking.hotel.name} · {booking.reference}
        </p>

        <dl className="mt-6 space-y-2 border-y border-sand-200 py-4 text-sm">
          <div className="flex justify-between"><dt>Dates</dt><dd>{formatDateHuman(booking.checkIn, locale)} → {formatDateHuman(booking.checkOut, locale)}</dd></div>
          <div className="flex justify-between"><dt>Rooms</dt><dd>{booking.rooms.map((r) => r.roomType.name).join(", ")}</dd></div>
          <div className="flex justify-between font-display text-lg"><dt>Total</dt><dd className="text-gold-600">{formatMoney(Number(booking.grandTotal))}</dd></div>
        </dl>

        <PaymentPanel
          locale={locale}
          bookingId={booking.id}
          reference={booking.reference}
          providerName={provider.name}
          redirectUrl={intent.redirectUrl}
          holdExpiresAt={booking.holdExpiresAt?.toISOString() ?? null}
        />

        <p className="mt-6 text-[11px] leading-4 text-ink-muted">
          Card data is processed by our PCI-compliant payment provider — it never touches Zarina Hotels servers.
          Payment status is verified server-side via signed webhooks before your booking is confirmed.
        </p>
      </div>
    </div>
  );
}
