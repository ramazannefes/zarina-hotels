// Create booking API — validates input with Zod, delegates to booking service,
// returns hold + authoritative price. Rate limited.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingWithHold, BookingError } from "@/lib/booking";

export const runtime = "nodejs";

const guestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  country: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
});

const bodySchema = z.object({
  hotelId: z.string().cuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(6),
  rooms: z.array(z.object({
    roomTypeId: z.string().cuid(),
    ratePlanId: z.string().cuid().optional().nullable(),
    quantity: z.number().int().min(1).max(5),
  })).min(1).max(4),
  extras: z.array(z.object({
    extraId: z.string().cuid(),
    quantity: z.number().int().min(1).max(5),
  })).max(8).optional(),
  promoCode: z.string().trim().max(40).optional().nullable(),
  specialRequests: z.string().trim().max(1000).optional().nullable(),
  arrivalTime: z.string().trim().max(20).optional().nullable(),
  locale: z.enum(["en", "ka", "tr"]).default("en"),
  guest: guestSchema,
});

const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 10): boolean {
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
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  try {
    const result = await createBookingWithHold(parsed.data);
    return NextResponse.json(result, { status: result.ok ? 201 : 409, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "SOLD_OUT" ? 409 : 400;
      return NextResponse.json({ error: err.code, detail: err.detail }, { status });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
