// Contact form API — validation, rate limiting, spam-safe storage.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(30).optional().nullable(),
  hotelId: z.string().cuid().optional().nullable(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
});

const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 5): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

// Simple honeypot: real users never fill the hidden "website" field
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  // Honeypot: pretend success, do nothing
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }
  await db.contactMessage.create({
    data: { ...parsed.data, ip },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
