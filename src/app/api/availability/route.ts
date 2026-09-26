// Availability API — public, rate limited, validated.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRoomAvailability } from "@/lib/availability";
import { BookingError } from "@/lib/booking";

export const runtime = "nodejs";

const querySchema = z.object({
  hotelId: z.string().cuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(10),
  children: z.coerce.number().int().min(0).max(6),
});

// Simple in-memory rate limiter (per-IP). Production: use Redis/upstash for multi-instance.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_HITS = 30;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  rec.count += 1;
  return rec.count <= MAX_HITS;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  try {
    const rooms = await getRoomAvailability(parsed.data);
    return NextResponse.json(
      { rooms: rooms.map((r) => ({ ...r, amenities: undefined })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.code, detail: err.detail }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
