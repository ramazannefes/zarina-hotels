import { describe, expect, it } from "vitest";
import {
  calculateTotal,
  priceRoomLine,
  applyPromo,
  priceExtras,
  isWeekend,
} from "@/lib/pricing";
import { nightsBetween } from "@/lib/money";

describe("pricing engine (server-side, brief #45)", () => {
  it("computes nights between dates", () => {
    expect(nightsBetween("2026-10-01", "2026-10-04")).toBe(3);
    expect(nightsBetween("2026-10-01", "2026-10-01")).toBe(0);
  });

  it("detects weekend nights (Fri/Sat)", () => {
    expect(isWeekend("2026-10-02")).toBe(true); // Friday
    expect(isWeekend("2026-10-03")).toBe(true); // Saturday
    expect(isWeekend("2026-10-06")).toBe(false); // Tuesday
  });

  it("uses daily rates when present, falls back to base/weekend otherwise", () => {
    const line = {
      roomTypeId: "r1",
      basePrice: 100,
      weekendPrice: 140,
      dailyRates: [{ date: "2026-10-01", price: 90, stopSell: false, minStay: null, maxStay: null }],
      quantity: 2,
    };
    // Thu Oct 1 (daily 90), Fri Oct 2 (weekend 140), Sat Oct 3 (140)
    const priced = priceRoomLine(line, "2026-10-01", "2026-10-04");
    expect(priced.nightlyRates.map((n) => n.price)).toEqual([90, 140, 140]);
    expect(priced.subtotal).toBeCloseTo((90 + 140 + 140) * 2, 2);
  });

  it("throws on stop-sell dates", () => {
    const line = {
      roomTypeId: "r1",
      basePrice: 100,
      dailyRates: [{ date: "2026-10-02", price: 100, stopSell: true, minStay: null, maxStay: null }],
      quantity: 1,
    };
    expect(() => priceRoomLine(line, "2026-10-01", "2026-10-04")).toThrow(/ROOM_SOLD_OUT/);
  });

  it("applies rate plan modifier", () => {
    const line = {
      roomTypeId: "r1",
      basePrice: 100,
      dailyRates: [{ date: "2026-10-01", price: 100, stopSell: false, minStay: null, maxStay: null }],
      ratePlanModifierPercent: -8,
      quantity: 1,
    };
    const priced = priceRoomLine(line, "2026-10-01", "2026-10-02");
    expect(priced.subtotal).toBeCloseTo(92, 2);
  });

  it("percent promo discounts correctly", () => {
    const discount = applyPromo({ code: "X", discountType: "PERCENT", discountValue: 12, discountAmount: 0 }, 1000, 3);
    expect(discount).toBe(120);
  });

  it("fixed promo applies per 3-night block and never exceeds amount", () => {
    expect(applyPromo({ code: "Y", discountType: "FIXED", discountValue: 50, discountAmount: 0 }, 1000, 6)).toBe(100);
    expect(applyPromo({ code: "Y", discountType: "FIXED", discountValue: 50, discountAmount: 0 }, 40, 2)).toBe(40);
  });

  it("prices per-night and per-person extras", () => {
    const total = priceExtras(
      [
        { extraId: "e1", unitPrice: 100, quantity: 1, priceType: "PER_NIGHT" },
        { extraId: "e2", unitPrice: 45, quantity: 2, priceType: "PER_PERSON" },
        { extraId: "e3", unitPrice: 50, quantity: 1, priceType: "PER_STAY" },
      ],
      3, // nights
      4, // guests
    );
    expect(total).toBe(300 + 45 * 2 * 4 + 50);
  });

  it("full calculation: rooms + extras + promo + tax", () => {
    const price = calculateTotal({
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      roomLines: [
        {
          roomTypeId: "r1",
          basePrice: 100,
          dailyRates: [],
          quantity: 1,
        },
      ],
      extras: [{ extraId: "e1", unitPrice: 50, quantity: 1, priceType: "PER_STAY" }],
      promo: { code: "X", discountType: "PERCENT", discountValue: 10, discountAmount: 0 },
      taxRatePercent: 5,
    });
    // 2 nights @100 (Thu, Fri — Fri is weekend but no weekendPrice → base)
    expect(price.roomsTotal).toBe(200);
    expect(price.extrasTotal).toBe(50);
    expect(price.discountTotal).toBe(25); // 10% of 250
    expect(price.taxesTotal).toBe(11.25); // 5% of 225
    expect(price.grandTotal).toBe(236.25);
    expect(price.currency).toBe("GEL");
  });

  it("rejects invalid date ranges", () => {
    expect(() =>
      calculateTotal({
        checkIn: "2026-10-05",
        checkOut: "2026-10-05",
        roomLines: [{ roomTypeId: "r1", basePrice: 100, dailyRates: [], quantity: 1 }],
      }),
    ).toThrow(/INVALID_DATES/);
  });
});
