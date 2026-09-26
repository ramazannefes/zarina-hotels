// Booking service — concurrency-safe reservation creation.
// Two customers can never buy the last room: inventory is incremented
// with atomic conditional UPDATE inside one transaction.

import { db } from "./db";
import { nightsBetween, stayDates, parseDateOnly } from "./money";
import {
  calculateTotal,
  num,
  isWeekend,
  type RoomRateInput,
  type ExtraInput,
  type PromoResult,
  type PriceBreakdown,
} from "./pricing";

const HOLD_MINUTES = 15;

export type CreateBookingInput = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  locale?: string;
  source?: string;
  promoCode?: string | null;
  specialRequests?: string | null;
  arrivalTime?: string | null;
  rooms: { roomTypeId: string; ratePlanId?: string | null; quantity: number }[];
  extras?: { extraId: string; quantity: number }[];
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country?: string | null;
    city?: string | null;
    address?: string | null;
  };
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; reference: string; price: PriceBreakdown; holdExpiresAt: Date }
  | { ok: false; error: string; detail?: string };

export class BookingError extends Error {
  constructor(
    public code:
      | "INVALID_DATES"
      | "CHECK_IN_IN_PAST"
      | "CHECK_OUT_BEFORE_CHECK_IN"
      | "STAY_TOO_LONG"
      | "HOTEL_NOT_FOUND"
      | "ROOM_NOT_FOUND"
      | "SOLD_OUT"
      | "MIN_STAY"
      | "MAX_STAY"
      | "PROMO_INVALID"
      | "EXTRA_NOT_FOUND"
      | "GUEST_OVER_CAPACITY",
    public detail?: string,
  ) {
    super(code);
  }
}

function makeReference(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ZAR-${year}-${suffix}`;
}

async function uniqueReference(attempt = 0): Promise<string> {
  const ref = makeReference();
  const existing = await db.booking.findUnique({ where: { reference: ref } });
  if (!existing) return ref;
  if (attempt > 5) throw new Error("REFERENCE_GEN_FAILED");
  return uniqueReference(attempt + 1);
}

export async function createBookingWithHold(input: CreateBookingInput): Promise<CreateBookingResult> {
  // 1) Date validation
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new BookingError("CHECK_OUT_BEFORE_CHECK_IN");
  if (nights > 30) throw new BookingError("STAY_TOO_LONG");
  const todayStr = new Date().toISOString().slice(0, 10);
  if (input.checkIn < todayStr) throw new BookingError("CHECK_IN_IN_PAST");

  const hotel = await db.hotel.findUnique({ where: { id: input.hotelId } });
  if (!hotel || !hotel.isActive) throw new BookingError("HOTEL_NOT_FOUND");

  // 2) Load room types + rate plans (server data only)
  const roomIds = input.rooms.map((r) => r.roomTypeId);
  const roomTypes = await db.roomType.findMany({
    where: { id: { in: roomIds }, hotelId: input.hotelId, isActive: true },
    include: { ratePlans: { where: { isActive: true } } },
  });
  if (roomTypes.length !== roomIds.length) throw new BookingError("ROOM_NOT_FOUND");
  const roomMap = new Map(roomTypes.map((r) => [r.id, r]));

  // 3) Guest capacity per room line
  const lineCount = input.rooms.length;
  for (const line of input.rooms) {
    const room = roomMap.get(line.roomTypeId);
    if (!room) throw new BookingError("ROOM_NOT_FOUND");
    const lineGuests = Math.ceil(input.adults / lineCount) + Math.ceil(input.children / lineCount);
    if (lineGuests > room.maxGuests) throw new BookingError("GUEST_OVER_CAPACITY");
  }

  // 4) Server-side pricing inputs (never trust client totals)
  const dates = stayDates(input.checkIn, input.checkOut);
  const dailyRates = await db.dailyRate.findMany({
    where: { roomTypeId: { in: roomIds }, date: { in: dates.map((d) => new Date(d)) } },
  });
  type DrRow = { price: number; stopSell: boolean; minStay: number | null; maxStay: number | null };
  const drMap = new Map<string, Map<string, DrRow>>();
  for (const dr of dailyRates) {
    const dateStr = dr.date.toISOString().slice(0, 10);
    if (!drMap.has(dr.roomTypeId)) drMap.set(dr.roomTypeId, new Map());
    drMap.get(dr.roomTypeId)?.set(dateStr, { price: num(dr.price), stopSell: dr.stopSell, minStay: dr.minStay, maxStay: dr.maxStay });
  }

  const roomLines: RoomRateInput[] = input.rooms.map((line) => {
    const room = roomMap.get(line.roomTypeId);
    if (!room) throw new BookingError("ROOM_NOT_FOUND");
    const plan = line.ratePlanId ? room.ratePlans.find((p) => p.id === line.ratePlanId) : undefined;
    const drForRoom = drMap.get(line.roomTypeId);
    return {
      roomTypeId: room.id,
      basePrice: num(room.basePrice),
      weekendPrice: room.weekendPrice ? num(room.weekendPrice) : null,
      dailyRates: dates.map((date) => {
        const d = drForRoom?.get(date);
        return {
          date,
          price: d ? d.price : room.weekendPrice && isWeekend(date) ? num(room.weekendPrice) : num(room.basePrice),
          stopSell: d?.stopSell ?? false,
          minStay: d?.minStay ?? null,
          maxStay: d?.maxStay ?? null,
        };
      }),
      ratePlanModifierPercent: plan ? num(plan.priceModifierPercent) : 0,
      quantity: line.quantity,
    };
  });

  // 5) Extras — DB prices only
  let extraInputs: ExtraInput[] = [];
  if (input.extras && input.extras.length > 0) {
    const extraRecords = await db.extra.findMany({
      where: { id: { in: input.extras.map((e) => e.extraId) }, isActive: true },
    });
    if (extraRecords.length !== input.extras.length) throw new BookingError("EXTRA_NOT_FOUND");
    extraInputs = input.extras.map((e) => {
      const rec = extraRecords.find((r) => r.id === e.extraId);
      if (!rec) throw new BookingError("EXTRA_NOT_FOUND");
      return {
        extraId: rec.id,
        unitPrice: num(rec.price),
        quantity: e.quantity,
        priceType: rec.priceType as ExtraInput["priceType"],
      };
    });
  }

  // 6) Promo validation (server-side)
  let promo: PromoResult = null;
  type PromoRec = Awaited<ReturnType<typeof db.promotion.findUnique>>;
  let promoRecord: NonNullable<PromoRec> | null = null;
  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    const now = new Date();
    const rec = await db.promotion.findUnique({ where: { code } });
    const okWindow =
      rec &&
      rec.isActive &&
      (!rec.bookingWindowFrom || rec.bookingWindowFrom <= now) &&
      (!rec.bookingWindowTo || rec.bookingWindowTo >= now) &&
      (!rec.stayDateFrom || rec.stayDateFrom <= parseDateOnly(input.checkIn)) &&
      (!rec.stayDateTo || rec.stayDateTo >= parseDateOnly(input.checkIn));
    if (!okWindow) throw new BookingError("PROMO_INVALID");
    if (rec!.maxUsage !== null && rec!.usageCount >= rec!.maxUsage) throw new BookingError("PROMO_INVALID");
    if (rec!.hotelId && rec!.hotelId !== input.hotelId) throw new BookingError("PROMO_INVALID");
    const allowedRoomIds = Array.isArray(rec!.roomTypeIds) ? (rec!.roomTypeIds as string[]) : [];
    if (allowedRoomIds.length > 0 && !allowedRoomIds.some((id) => roomIds.includes(id))) throw new BookingError("PROMO_INVALID");
    promoRecord = rec;
    promo = {
      code: rec!.code,
      discountType: rec!.discountType as "PERCENT" | "FIXED",
      discountValue: num(rec!.discountValue),
      discountAmount: 0,
    };
  }

  // 7) Authoritative price
  const price = calculateTotal({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    roomLines,
    extras: extraInputs,
    promo,
  });

  // 8) Min stay
  const minStay = Math.min(...roomTypes.map((r) => r.minStay));
  if (price.nights < minStay) throw new BookingError("MIN_STAY", String(minStay));

  // 9) Create booking + atomic inventory hold in ONE transaction
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const reference = await uniqueReference();

  const booking = await db.$transaction(
    async (tx) => {
      // Atomic hold via optimistic concurrency (works on SQLite & PostgreSQL):
      // read row → check capacity → conditional UPDATE matching the exact previous
      // values → if 0 rows updated, someone else changed it; retry, then fail.
      for (const line of input.rooms) {
        for (let q = 0; q < line.quantity; q++) {
          for (const date of dates) {
            const dateObj = new Date(`${date}T00:00:00.000Z`);
            let incremented = false;
            for (let attempt = 0; attempt < 3 && !incremented; attempt++) {
              const row = await tx.roomInventory.findUnique({
                where: { roomTypeId_date: { roomTypeId: line.roomTypeId, date: dateObj } },
              });
              if (!row || row.stopSell) throw new BookingError("SOLD_OUT", date);
              if (row.inventory - row.bookedCount - row.heldCount <= 0) {
                throw new BookingError("SOLD_OUT", date);
              }
              const res = await tx.roomInventory.updateMany({
                where: {
                  id: row.id,
                  inventory: row.inventory,
                  bookedCount: row.bookedCount,
                  heldCount: row.heldCount,
                  stopSell: false,
                },
                data: { heldCount: { increment: 1 } },
              });
              incremented = res.count === 1;
            }
            if (!incremented) throw new BookingError("SOLD_OUT", date);
          }
        }
      }

      const guestRec = await tx.guest.create({ data: { ...input.guest, isDemo: false } });
      const bk = await tx.booking.create({
        data: {
          reference,
          hotelId: input.hotelId,
          status: "HOLDING",
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          adults: input.adults,
          children: input.children,
          nights: price.nights,
          currency: "GEL",
          roomsTotal: price.roomsTotal,
          extrasTotal: price.extrasTotal,
          discountTotal: price.discountTotal,
          taxesTotal: price.taxesTotal,
          grandTotal: price.grandTotal,
          taxRatePercent: price.taxRatePercent,
          promoCode: promoRecord?.code ?? null,
          source: input.source ?? "direct",
          locale: input.locale ?? "en",
          specialRequests: input.specialRequests,
          arrivalTime: input.arrivalTime,
          holdExpiresAt,
          guest: { connect: { id: guestRec.id } },
        },
      });

      for (const line of input.rooms) {
        const priced = price.rooms.find((r) => r.roomTypeId === line.roomTypeId);
        if (!priced) throw new BookingError("ROOM_NOT_FOUND");
        const plan = line.ratePlanId
          ? roomMap.get(line.roomTypeId)?.ratePlans.find((p) => p.id === line.ratePlanId)
          : null;
        await tx.bookingRoom.create({
          data: {
            bookingId: bk.id,
            roomTypeId: line.roomTypeId,
            ratePlanId: plan?.id ?? null,
            quantity: line.quantity,
            nightlyRates: priced.nightlyRates,
            roomsSubtotal: priced.subtotal,
          },
        });
      }

      for (const e of extraInputs) {
        await tx.bookingExtra.create({
          data: {
            bookingId: bk.id,
            extraId: e.extraId,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            total: e.unitPrice * e.quantity,
          },
        });
      }

      if (promoRecord && promo) {
        await tx.promotionUsage.create({
          data: {
            promotionId: promoRecord.id,
            bookingId: bk.id,
            discountAmount: price.discountTotal,
          },
        });
        await tx.promotion.update({
          where: { id: promoRecord.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      return bk;
    },
    { timeout: 15_000 },
  );

  return { ok: true, bookingId: booking.id, reference: booking.reference, price, holdExpiresAt };
}
