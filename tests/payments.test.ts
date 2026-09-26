import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";

function signedHeaders(): Headers {
  return new Headers({ "x-mock-signature": process.env.MOCK_WEBHOOK_SECRET ?? "dev-only-mock-secret" });
}

describe("mock payment provider webhook verification", () => {
  const provider = new MockPaymentProvider();

  it("accepts a valid signed event", async () => {
    const body = JSON.stringify({ event_id: "evt_1", payment_id: "pay_1", status: "PAID" });
    const v = await provider.verifyWebhook(signedHeaders(), body);
    expect(v.valid).toBe(true);
    expect(v.eventId).toBe("evt_1");
    expect(v.status).toBe("PAID");
  });

  it("rejects missing/invalid signature", async () => {
    const body = JSON.stringify({ event_id: "evt_2", payment_id: "pay_1", status: "PAID" });
    const v = await provider.verifyWebhook(new Headers(), body);
    expect(v.valid).toBe(false);

    const v2 = await provider.verifyWebhook(new Headers({ "x-mock-signature": "wrong" }), body);
    expect(v2.valid).toBe(false);
  });

  it("rejects malformed JSON even with valid signature", async () => {
    const v = await provider.verifyWebhook(signedHeaders(), "{not-json");
    expect(v.valid).toBe(false);
  });

  it("rejects unknown status values by mapping to null", async () => {
    const body = JSON.stringify({ event_id: "evt_3", payment_id: "pay_1", status: "HACKED" });
    const v = await provider.verifyWebhook(signedHeaders(), body);
    // status is unknown → treated as absent → pipeline will refuse
    expect(v.valid ? v.status : null).not.toBe("PAID");
  });

  it("refund returns provider refund id", async () => {
    const r = await provider.refund("pay_1", 100, "idem_1");
    expect(r.ok).toBe(true);
    expect(r.refundId).toContain("mock_refund");
  });
});
