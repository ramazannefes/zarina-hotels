// Server-side pricing engine — the ONLY authoritative price calculator.
// Frontend totals are never trusted (Booking Price Integrity, brief #45).

import { nightsBetween, stayDates, parseDateOnly } from "./money";

export type DecimalLike = { toNumber: () => number } | number | string;

export function num(v: DecimalLike): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return v.toNumber();
}

export type RoomRateInput = {
  roomTypeId: string;
  basePrice: number; // GEL/night
  weekendPrice?: number | null;
  dailyRates: { date: string; price: number; stopSell: boolean; minStay: number | null; maxStay: number | null }[];
  ratePlanModifierPercent?: number; // e.g. -8 for non-refundable, +25 half board
  quantity: number;
};

export type RoomPriced = {
  roomTypeId: string;
  quantity: number;
  nightlyRates: { date: string; price: number }[];
  subtotal: number;
};

export type ExtraInput = { extraId: string; unitPrice: number; quantity: number; priceType: "PER_STAY" | "PER_NIGHT" | "PER_PERSON" | "PER_BOOKING" };

export type PromoResult = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  discountAmount: number;
} | null;

export type PriceBreakdown = {
  nights: number;
  rooms: RoomPriced[];
  roomsTotal: number;
  extrasTotal: number;
  discountTotal: number;
  taxesTotal: number;
  grandTotal: number;
  taxRatePercent: number;
  currency: "GEL";
};

const TAX_RATE_PERCENT = 0; // NEEDS ADMIN VERIFICATION: Georgian accommodation tax treatment — set in Settings
const round2 = (n: number) => Math.round(n * 100) / 100;

export function isWeekend(dateStr: string): boolean {
  const day = parseDateOnly(dateStr).getUTCDay();
  return day === 5 || day === 6; // Fri, Sat nights
}

/** Resolve the nightly price for each stay date for one room line. */
export function priceRoomLine(line: RoomRateInput, checkIn: string, checkOut: string): RoomPriced {
  const dates = stayDates(checkIn, checkOut);
  const dailyMap = new Map(line.dailyRates.map((d) => [d.date, d]));
  const nightlyRates = dates.map((date) => {
    const daily = dailyMap.get(date);
    if (daily) {
      if (daily.stopSell) throw new Error(`ROOM_SOLD_OUT:${date}`);
      return { date, price: round2(daily.price) };
    }
    const base = line.weekendPrice && isWeekend(date) ? line.weekendPrice : line.basePrice;
    return { date, price: round2(base) };
  });
  const perRoom = nightlyRates.reduce((s, n) => s + n.price, 0);
  const withPlan = line.ratePlanModifierPercent
    ? perRoom * (1 + line.ratePlanModifierPercent / 100)
    : perRoom;
  const subtotal = round2(withPlan * line.quantity);
  return { roomTypeId: line.roomTypeId, quantity: line.quantity, nightlyRates, subtotal };
}

export function priceExtras(extras: ExtraInput[], nights: number, guests: number): number {
  return round2(
    extras.reduce((sum, e) => {
      const units =
        e.priceType === "PER_NIGHT" ? nights : e.priceType === "PER_PERSON" ? guests : 1;
      return sum + e.unitPrice * units * e.quantity;
    }, 0),
  );
}

export function applyPromo(
  promo: PromoResult,
  amountAfterExtras: number,
  nights: number,
): number {
  if (!promo) return 0;
  if (promo.discountType === "PERCENT") {
    return round2((amountAfterExtras * promo.discountValue) / 100);
  }
  // fixed discount per stay, cannot exceed amount
  return round2(Math.min(promo.discountValue * Math.max(1, Math.floor(nights / 3)), amountAfterExtras));
}

export function calculateTotal(params: {
  checkIn: string;
  checkOut: string;
  roomLines: RoomRateInput[];
  extras?: ExtraInput[];
  promo?: PromoResult;
  taxRatePercent?: number;
}): PriceBreakdown {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  if (nights < 1) throw new Error("INVALID_DATES");

  const rooms = params.roomLines.map((line) => priceRoomLine(line, params.checkIn, params.checkOut));
  const roomsTotal = round2(rooms.reduce((s, r) => s + r.subtotal, 0));
  const guests = params.roomLines.reduce((s, r) => s + r.quantity * 2, 0); // conservative guest count for PER_PERSON extras

  const extrasTotal = params.extras ? priceExtras(params.extras, nights, guests) : 0;
  const base = round2(roomsTotal + extrasTotal);
  const discountTotal = params.promo ? applyPromo(params.promo, base, nights) : 0;
  const taxRatePercent = params.taxRatePercent ?? TAX_RATE_PERCENT;
  const taxable = round2(base - discountTotal);
  const taxesTotal = round2((taxable * taxRatePercent) / 100);
  const grandTotal = round2(taxable + taxesTotal);

  return {
    nights,
    rooms,
    roomsTotal,
    extrasTotal,
    discountTotal,
    taxesTotal,
    grandTotal,
    taxRatePercent,
    currency: "GEL",
  };
}

/** Validate min/max stay against daily rates (min stay enforced at arrival date). */
export function validateStayRules(
  lines: { minStay: number | null; maxStay: number | null }[],
  checkIn: string,
  nights: number,
): void {
  for (const line of lines) {
    if (line.minStay && nights < line.minStay) throw new Error(`MIN_STAY:${line.minStay}`);
    if (line.maxStay && nights > line.maxStay) throw new Error(`MAX_STAY:${line.maxStay}`);
  }
}
