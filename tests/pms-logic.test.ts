import { describe, expect, it } from "vitest";
import { deriveRoomStatus, derivePaymentState, utcToday } from "@/lib/pms/status";

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

describe("PMS room status derivation", () => {
  it("returns manual override MAINTENANCE regardless of stays", () => {
    const result = deriveRoomStatus(
      { status: "MAINTENANCE" },
      { activeStays: [{ id: "1", checkIn: daysFromNow(-1), checkOut: daysFromNow(1), status: "CHECKED_IN" }] },
    );
    expect(result).toBe("MAINTENANCE");
  });

  it("returns OCCUPIED when a CHECKED_IN stay covers today", () => {
    const result = deriveRoomStatus(
      { status: "FREE" },
      { activeStays: [{ id: "1", checkIn: daysFromNow(-2), checkOut: daysFromNow(2), status: "CHECKED_IN" }] },
    );
    expect(result).toBe("OCCUPIED");
  });

  it("returns RESERVED when a future confirmed stay overlaps today's window", () => {
    const result = deriveRoomStatus(
      { status: "FREE" },
      { activeStays: [{ id: "1", checkIn: daysFromNow(-1), checkOut: daysFromNow(3), status: "CONFIRMED" }] },
    );
    expect(result).toBe("RESERVED");
  });

  it("returns FREE when no active stay covers today", () => {
    const result = deriveRoomStatus(
      { status: "FREE" },
      { activeStays: [{ id: "1", checkIn: daysFromNow(5), checkOut: daysFromNow(8), status: "CONFIRMED" }] },
    );
    expect(result).toBe("FREE");
  });

  it("check-out day means room is free again (checkout exclusive)", () => {
    // stay ends today → today is NOT within [ci, co)
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    const result = deriveRoomStatus(
      { status: "FREE" },
      { activeStays: [{ id: "1", checkIn: daysFromNow(-3), checkOut: today, status: "CHECKED_IN" }] },
    );
    expect(result).toBe("FREE");
  });
});

describe("PMS payment state derivation", () => {
  it("UNPAID when nothing paid", () => {
    expect(derivePaymentState(0, 100)).toBe("UNPAID");
  });

  it("PARTIAL between 0 and total", () => {
    expect(derivePaymentState(40, 100)).toBe("PARTIAL");
  });

  it("PAID at exact total", () => {
    expect(derivePaymentState(100, 100)).toBe("PAID");
  });

  it("OVERPAID beyond total", () => {
    expect(derivePaymentState(150, 100)).toBe("OVERPAID");
  });
});

describe("PMS date helpers", () => {
  it("utcToday returns YYYY-MM-DD", () => {
    expect(utcToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("PMS overlap rule (semantics)", () => {
  // Mirror of the rule in service.ts assertNoOverlap:
  // existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
  function overlaps(ciA: string, coA: string, ciB: string, coB: string): boolean {
    return ciA < coB && coA > ciB;
  }

  it("detects direct overlap", () => {
    expect(overlaps("2026-10-01", "2026-10-05", "2026-10-03", "2026-10-06")).toBe(true);
  });

  it("allows back-to-back (checkout = checkin day)", () => {
    expect(overlaps("2026-10-01", "2026-10-05", "2026-10-05", "2026-10-08")).toBe(false);
  });

  it("detects containment", () => {
    expect(overlaps("2026-10-01", "2026-10-10", "2026-10-03", "2026-10-05")).toBe(true);
  });

  it("detects identical ranges", () => {
    expect(overlaps("2026-10-01", "2026-10-05", "2026-10-01", "2026-10-05")).toBe(true);
  });
});
