// MOCK payment completion endpoint.
// Simulates what the real provider's WEBHOOK would do: it posts a signed event
// to /api/payments/webhook. Frontend redirects NEVER confirm payments directly.
// Disabled when PAYMENT_PROVIDER != MOCK.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.PAYMENT_PROVIDER !== "MOCK") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  let body: { bookingId?: string; success?: boolean };
  try {
    body = (await req.json()) as { bookingId?: string; success?: boolean };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!body.bookingId) return NextResponse.json({ error: "MISSING_BOOKING" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { id: body.bookingId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!["HOLDING", "PENDING_PAYMENT"].includes(booking.status)) {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
  }

  const payment = booking.payments[0];
  if (!payment?.providerPaymentId) return NextResponse.json({ error: "NO_INTENT" }, { status: 409 });

  // Build a provider event and verify it through the SAME webhook pipeline as production.
  const event = {
    event_id: `evt_mock_${payment.id}_${Date.now()}`,
    payment_id: payment.providerPaymentId,
    status: body.success ? "PAID" : "FAILED",
  };

  const { processPaymentWebhook } = await import("@/lib/payments");
  const { MockPaymentProvider } = await import("@/lib/payments/mock-provider");
  const provider = new MockPaymentProvider();

  const headers = new Headers({ "x-mock-signature": process.env.MOCK_WEBHOOK_SECRET ?? "dev-only-mock-secret" });
  const verification = await provider.verifyWebhook(headers, JSON.stringify(event));
  const result = await processPaymentWebhook(verification);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Post-payment side effects (emails) fire only on confirmed state
  if (result.action === "confirmed" && body.success) {
    const { sendEmail } = await import("@/lib/email");
    const { bookingConfirmationEmail, adminNewBookingEmail } = await import("@/lib/email/templates");
    const { formatMoney } = await import("@/lib/money");
    const fresh = await db.booking.findUnique({
      where: { id: booking.id },
      include: {
        guest: true, hotel: { select: { name: true } },
        rooms: { include: { roomType: { select: { name: true } } } },
      },
    });
    if (fresh?.guest) {
      const emailData = {
        reference: fresh.reference,
        hotelName: fresh.hotel.name,
        roomNames: fresh.rooms.map((r) => `${r.roomType.name} ×${r.quantity}`).join(", "),
        checkIn: fresh.checkIn.toISOString().slice(0, 10),
        checkOut: fresh.checkOut.toISOString().slice(0, 10),
        nights: fresh.nights,
        guests: `${fresh.adults} adults${fresh.children ? ` + ${fresh.children} children` : ""}`,
        total: formatMoney(Number(fresh.grandTotal)),
        guestName: fresh.guest.firstName,
        manageUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/manage-booking?ref=${fresh.reference}`,
      };
      const guestTpl = bookingConfirmationEmail(emailData);
      await sendEmail({ to: fresh.guest.email, template: "booking_confirmation", subject: guestTpl.subject, html: guestTpl.html, bookingId: fresh.id });
      const adminTpl = adminNewBookingEmail(emailData);
      const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
      if (adminEmail) {
        await sendEmail({ to: adminEmail, template: "admin_new_booking", subject: adminTpl.subject, html: adminTpl.html, bookingId: fresh.id });
      }
      const { notifyAdmins } = await import("@/lib/notify");
      await notifyAdmins({
        kind: "reservation",
        title: `Yeni online rezervasyon: ${fresh.reference}`,
        body: `${fresh.guest.firstName} ${fresh.guest.lastName} · ${fresh.hotel.name} · ${emailData.total}`,
        link: "/admin/reservations",
        hotelId: fresh.hotelId,
        bookingId: fresh.id,
      });
    }
  }

  return NextResponse.json({ ok: true, action: result.action });
}
