// MOCK payment provider — development/testing only.
// Clearly labeled as demo. Real keys switch PAYMENT_PROVIDER to BOG/TBC in env.

import type { PaymentProvider, PaymentIntentInput, PaymentIntentResult, WebhookVerification } from "./types";

const MOCK_SECRET = process.env.MOCK_WEBHOOK_SECRET ?? "dev-only-mock-secret";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const providerPaymentId = `mock_${input.idempotencyKey.slice(0, 18)}`;
    return {
      providerPaymentId,
      status: "PENDING",
      redirectUrl: `/payment/mock?intent=${encodeURIComponent(providerPaymentId)}&booking=${encodeURIComponent(input.bookingId)}`,
    };
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerification> {
    // Mock signature: HMAC-like check against dev secret (structure mirrors real providers)
    const sig = headers.get("x-mock-signature");
    if (!sig || sig !== MOCK_SECRET) return { valid: false, eventId: null, providerPaymentId: null, status: null };
    try {
      const event = JSON.parse(rawBody) as {
        event_id?: string;
        payment_id?: string;
        status?: WebhookVerification["status"];
      };
      return {
        valid: true,
        eventId: event.event_id ?? null,
        providerPaymentId: event.payment_id ?? null,
        status: event.status ?? null,
      };
    } catch {
      return { valid: false, eventId: null, providerPaymentId: null, status: null };
    }
  }

  async refund(providerPaymentId: string, _amount: number, idempotencyKey: string): Promise<{ ok: boolean; refundId: string | null; error?: string }> {
    return { ok: true, refundId: `mock_refund_${idempotencyKey.slice(0, 12)}` };
  }

  async getStatus(_providerPaymentId: string): Promise<PaymentIntentResult["status"]> {
    return "PENDING";
  }
}

export function assertMockAllowed(): void {
  if (process.env.PAYMENT_PROVIDER !== "MOCK" && process.env.NODE_ENV === "production") {
    throw new Error("MOCK payment provider is disabled in production");
  }
}
