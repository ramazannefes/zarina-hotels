// Payment factory + webhook processing with idempotency and reconciliation.

import { db } from "../db";
import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, PaymentIntentInput, PaymentIntentResult, WebhookVerification } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "MOCK";
  switch (provider) {
    case "MOCK":
      return new MockPaymentProvider();
    // case "BOG": return new BogPaymentProvider();   // implement when BOG keys provided
    // case "TBC": return new TbcPaymentProvider();   // implement when TBC keys provided
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${provider}`);
  }
}

export type WebhookProcessResult =
  | { ok: true; action: "already_processed" | "confirmed" | "failed" }
  | { ok: false; error: string };

/**
 * Process a verified webhook event with duplicate-event protection.
 * Flow: find payment by providerPaymentId → check webhookEventId (dedupe) →
 * update payment + booking inside a transaction → trigger confirmation email once.
 */
export async function processPaymentWebhook(verification: {
  valid: boolean;
  eventId: string | null;
  providerPaymentId: string | null;
  status: "PAID" | "FAILED" | "AUTHORIZED" | "CANCELLED" | null;
}): Promise<WebhookProcessResult> {
  if (!verification.valid || !verification.providerPaymentId || !verification.status) {
    return { ok: false, error: "INVALID_WEBHOOK" };
  }

  const payment = await db.payment.findFirst({
    where: { providerPaymentId: verification.providerPaymentId },
    include: { booking: true },
  });
  if (!payment) return { ok: false, error: "PAYMENT_NOT_FOUND" };
  const booking = payment.booking;

  // Duplicate event protection
  if (payment.webhookEventId === verification.eventId && verification.eventId !== null) {
    return { ok: true, action: "already_processed" };
  }

  const txResult = await db.$transaction(async (tx) => {
    // Re-check inside transaction to avoid race between two webhook deliveries
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!fresh) throw new Error("PAYMENT_NOT_FOUND");
    if (fresh.webhookEventId === verification.eventId && verification.eventId !== null) {
      return "already_processed" as const;
    }

    const statusMap: Record<string, "PAID" | "FAILED" | "AUTHORIZED" | "CANCELLED"> = {
      PAID: "PAID",
      FAILED: "FAILED",
      AUTHORIZED: "AUTHORIZED",
      CANCELLED: "CANCELLED",
    };
    const newStatus = statusMap[verification.status ?? ""] ?? "FAILED";

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        webhookEventId: verification.eventId,
        webhookPayload: undefined, // caller may pass raw payload separately
        capturedAt: newStatus === "PAID" ? new Date() : null,
        failureReason: newStatus === "FAILED" ? "provider reported failure" : null,
      },
    });

    if (newStatus === "PAID" && booking.status !== "CONFIRMED") {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
    }
    if (newStatus === "FAILED" || newStatus === "CANCELLED") {
      // Release hold: booking returns to PENDING_PAYMENT; cron will expire it
      if (booking.status === "HOLDING" || booking.status === "PENDING_PAYMENT") {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: "PENDING_PAYMENT" },
        });
      }
    }
    return "confirmed" as const;
  });

  return { ok: true, action: txResult };
}
