// Payment abstraction — swap providers without touching booking logic.
// NEVER store raw card data. Providers are PCI-compliant; we only handle tokens/statuses.

export type PaymentIntentInput = {
  bookingId: string;
  amount: number; // canonical GEL
  currency: "GEL";
  idempotencyKey: string;
  description: string;
  callbackUrl: string;
  failUrl: string;
};

export type PaymentIntentResult = {
  providerPaymentId: string;
  status: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED";
  redirectUrl: string | null; // where to send the customer (hosted checkout)
};

export type WebhookVerification = {
  valid: boolean;
  eventId: string | null;
  providerPaymentId: string | null;
  status: "PAID" | "FAILED" | "AUTHORIZED" | "CANCELLED" | null;
};

export interface PaymentProvider {
  readonly name: "MOCK" | "BOG" | "TBC" | "STRIPE";
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerification>;
  refund(providerPaymentId: string, amount: number, idempotencyKey: string): Promise<{ ok: boolean; refundId: string | null; error?: string }>;
  getStatus(providerPaymentId: string): Promise<PaymentIntentResult["status"]>;
}
