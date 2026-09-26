// Availability service — reads per-date inventory counters.
// sold-out detection, stop-sell, CTA/CTD and min-stay rules.

import { db } from "./db";
import { stayDates, nightsBetween, parseDateOnly } from "./money";
import { num } from "./pricing";

export type AvailabilityRequest = {
  hotelId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
};

export type RoomAvailability = {
  roomTypeId: string;
  code: string;
  name: string;
  shortDescription: string | null;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  sizeSqm: number | null;
  viewType: string;
  bedDescription: string | null;
  basePrice: number;
  weekendPrice: number | null;
  breakfastIncluded: boolean;
  minStay: number;
  isFeatured: boolean;
  images: { url: string; alt: string | null; isPlaceholder: boolean }[];
  amenities: string[];
  // availability
  sellable: number; // min across stay dates of (inventory - booked - held)
  totalUnits: number;
  status: "available" | "limited" | "sold_out";
  nightsPrice: number; // total for the stay for 1 unit
  avgNightly: number;
  stopSellDates: string[];
  minStayViolation: boolean;
};

export function validateDateRange(checkIn: string, checkOut: string): void {
  const ci = parseDateOnly(checkIn);
  const co = parseDateOnly(checkOut);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (Number.isNaN(ci.getTime()) || Number.isNaN(co.getTime())) throw new Error("INVALID_DATES");
  if (ci < parseDateOnly(todayStr)) throw new Error("CHECK_IN_IN_PAST");
  if (co <= ci) throw new Error("CHECK_OUT_BEFORE_CHECK_IN");
  if (nightsBetween(checkIn, checkOut) > 30) throw new Error("STAY_TOO_LONG");
}

export async function getRoomAvailability(req: AvailabilityRequest): Promise<RoomAvailability[]> {
  validateDateRange(req.checkIn, req.checkOut);
  const nights = nightsBetween(req.checkIn, req.checkOut);
  const dates = stayDates(req.checkIn, req.checkOut);

  const rooms = await db.roomType.findMany({
    where: { hotelId: req.hotelId, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (rooms.length === 0) return [];

  const inventory = await db.roomInventory.findMany({
    where: { roomTypeId: { in: rooms.map((r) => r.id) }, date: { in: dates.map((d) => new Date(d)) } },
  });
  const dailyRates = await db.dailyRate.findMany({
    where: { roomTypeId: { in: rooms.map((r) => r.id) }, date: { in: dates.map((d) => new Date(d)) } },
  });

  const invMap = new Map<string, Map<string, { inventory: number; booked: number; held: number; stopSell: boolean; cta: boolean; ctd: boolean }>>();
  for (const inv of inventory) {
    const dateStr = inv.date.toISOString().slice(0, 10);
    if (!invMap.has(inv.roomTypeId)) invMap.set(inv.roomTypeId, new Map());
    invMap.get(inv.roomTypeId)!.set(dateStr, {
      inventory: inv.inventory,
      booked: inv.bookedCount,
      held: inv.heldCount,
      stopSell: inv.stopSell,
      cta: inv.closedToArrival,
      ctd: inv.closedToDeparture,
    });
  }
  const rateMap = new Map<string, Map<string, { price: number; stopSell: boolean; minStay: number | null; maxStay: number | null }>>();
  for (const dr of dailyRates) {
    const dateStr = dr.date.toISOString().slice(0, 10);
    if (!rateMap.has(dr.roomTypeId)) rateMap.set(dr.roomTypeId, new Map());
    rateMap.get(dr.roomTypeId)!.set(dateStr, { price: num(dr.price), stopSell: dr.stopSell, minStay: dr.minStay, maxStay: dr.maxStay });
  }

  return rooms.map((room) => {
    const inv = invMap.get(room.id) ?? new Map();
    const rates = rateMap.get(room.id) ?? new Map();

    let sellable = room.inventoryCount;
    const stopSellDates: string[] = [];

    const isWeekendDate = (d: string) => {
      const day = parseDateOnly(d).getUTCDay();
      return day === 5 || day === 6;
    };

    let nightsPrice = 0;
    for (const date of dates) {
      const i = inv.get(date);
      const r = rates.get(date);
      const unitsAvail = i ? Math.max(0, i.inventory - i.booked - i.held) : room.inventoryCount;
      sellable = Math.min(sellable, unitsAvail);
      if ((i?.stopSell ?? false) || (r?.stopSell ?? false)) stopSellDates.push(date);
      if (r?.stopSell) sellable = 0;
      if (r) {
        nightsPrice += r.price;
      } else {
        const wp = room.weekendPrice ? num(room.weekendPrice) : null;
        nightsPrice += wp && isWeekendDate(date) ? wp : num(room.basePrice);
      }
    }

    const minStayViolation =
      (room.minStay > nights) ||
      Boolean(rates.get(req.checkIn)?.minStay && nights < (rates.get(req.checkIn)!.minStay ?? 0)) ||
      // CTA: arrival date closed
      Boolean(inv.get(req.checkIn)?.cta) ||
      // CTD: departure date closed
      Boolean(inv.get(req.checkOut)?.ctd);

    const effectiveSellable = stopSellDates.length > 0 ? 0 : sellable;
    const status: RoomAvailability["status"] =
      effectiveSellable === 0 || minStayViolation ? "sold_out" : effectiveSellable <= 2 ? "limited" : "available";

    return {
      roomTypeId: room.id,
      code: room.code,
      name: room.name,
      shortDescription: room.shortDescription,
      maxGuests: room.maxGuests,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      sizeSqm: room.sizeSqm,
      viewType: room.viewType,
      bedDescription: room.bedDescription,
      basePrice: num(room.basePrice),
      weekendPrice: room.weekendPrice ? num(room.weekendPrice) : null,
      breakfastIncluded: room.breakfastIncluded,
      minStay: room.minStay,
      isFeatured: room.isFeatured,
      images: room.images.map((m) => ({ url: m.url, alt: m.alt, isPlaceholder: m.isPlaceholder })),
      amenities: room.amenities.map((ra) => ra.amenity.key),
      sellable: effectiveSellable,
      totalUnits: room.inventoryCount,
      status,
      nightsPrice: Math.round(nightsPrice * 100) / 100,
      avgNightly: Math.round((nightsPrice / nights) * 100) / 100,
      stopSellDates,
      minStayViolation,
    };
  });
}
