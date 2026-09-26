// Payment webhook endpoint.
// Security: signature verified via provider abstraction BEFORE any state change.
// Duplicate events are safe (idempotent). Frontend redirects never confirm payments.

import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, processPaymentWebhook } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = getPaymentProvider();

  try {
    const verification = await provider.verifyWebhook(req.headers, rawBody);
    if (!verification.valid) {
      // Log-less 401: do not reveal validation details
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const result = await processPaymentWebhook(verification);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ received: true, action: result.action });
  } catch {
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
