// Manage-booking lookup: requires BOTH reference and email (prevents enumeration).
// Rate limited per IP. Returns only the caller's booking.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  reference: z.string().trim().min(6).max(24),
  email: z.string().trim().email().max(160),
});

const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 8): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { reference: parsed.data.reference.toUpperCase() },
    include: {
      hotel: { select: { name: true, city: true, phone: true } },
      rooms: { include: { roomType: { select: { name: true } } } },
      guest: { select: { firstName: true, lastName: true, email: true } },
      payments: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Uniform response: never reveal whether a reference exists
  if (!booking || !booking.guest || booking.guest.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      reference: booking.reference,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      hotel: booking.hotel,
      rooms: booking.rooms.map((r) => ({ name: r.roomType.name, quantity: r.quantity })),
      grandTotal: booking.grandTotal,
      currency: booking.currency,
      paymentStatus: booking.payments.length > 0 ? booking.payments[0]?.status : null,
    },
  });
}
