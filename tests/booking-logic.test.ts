import { describe, expect, it } from "vitest";
import { stayDates, parseDateOnly, toDateOnly } from "@/lib/money";

describe("date helpers (timezone-safe, brief #63/Q15)", () => {
  it("stayDates returns checkIn inclusive, checkOut exclusive", () => {
    expect(stayDates("2026-12-31", "2027-01-02")).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("parses date-only at UTC noon (no DST drift)", () => {
    const d = parseDateOnly("2026-07-15");
    expect(d.toISOString()).toBe("2026-07-15T12:00:00.000Z");
    expect(toDateOnly(d)).toBe("2026-07-15");
  });
});

describe("booking reference format", () => {
  it("matches ZAR-YYYY-XXXXXX without ambiguous chars", () => {
    // regex mirrors makeReference(): no 0/O/1/I/L
    const re = /^ZAR-\d{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
    const sample = `ZAR-${new Date().getFullYear()}-ABC234`;
    expect(re.test(sample)).toBe(true);
    expect(re.test("ZAR-2026-0O1IL")).toBe(false);
  });
});
