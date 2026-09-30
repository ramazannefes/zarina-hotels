// PMS queries — server-side aggregations for the management dashboard.
// All figures are computed in the database layer; nothing hardcoded.

import { db } from "@/lib/db";
import { num } from "@/lib/pricing";
import { utcToday } from "./status";

export type DashboardStats = {
  totalRooms: number;
  freeRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  awaitingCheckin: number;
  awaitingCheckout: number;
  maintenanceRooms: number;
  blockedRooms: number;
  housekeepingDirty: number;
  housekeepingClean: number;
  housekeepingInProgress: number;
  housekeepingPending: number; // CLEANING_PENDING + INSPECTION_PENDING
  arrivalsToday: number;
  departuresToday: number;
  inHouseGuests: number;
  occupancyRate: number; // 0-100
  todayCollected: number;
  pendingPayment: number; // outstanding balance on active PMS bookings
  totalBalance: number; // total receivable (cari)
  activeReservations: number;
};

const REVENANT_STATUSES = ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] as const;

/**
 * Aggregated dashboard statistics in a handful of grouped queries.
 * Physical-room figures come from the Room table (authoritative cache,
 * updated by the PMS service on every transition).
 */
export async function getDashboardStats(hotelId?: string): Promise<DashboardStats> {
  const today = utcToday();
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(`${today}T23:59:59.999Z`);

  const roomWhere = { isActive: true, ...(hotelId ? { hotelId } : {}) };

  const [totalRooms, statusGroups, hkGroups, arrivals, departures, inHouse, paymentsToday, financials, activeReservations] =
    await Promise.all([
      db.room.count({ where: roomWhere }),
      db.room.groupBy({
        by: ["status"],
        where: roomWhere,
        _count: { _all: true },
      }),
      db.room.groupBy({
        by: ["housekeeping"],
        where: roomWhere,
        _count: { _all: true },
      }),
      db.booking.count({
        where: { checkIn: { gte: todayStart, lte: todayEnd }, status: { in: [...REVENANT_STATUSES] }, ...(hotelId ? { hotelId } : {}) },
      }),
      db.booking.count({
        where: { checkOut: { gte: todayStart, lte: todayEnd }, status: { in: [...REVENANT_STATUSES, "CHECKED_OUT"] }, ...(hotelId ? { hotelId } : {}) },
      }),
      db.booking.count({
        where: { status: "CHECKED_IN", ...(hotelId ? { hotelId } : {}) },
      }),
      db.payment.aggregate({
        where: { status: "PAID", capturedAt: { gte: todayStart, lte: todayEnd }, ...(hotelId ? { booking: { hotelId } } : {}) },
        _sum: { amount: true },
      }),
      activeFinancials(hotelId),
      db.booking.count({
        where: { status: { in: [...REVENANT_STATUSES] }, ...(hotelId ? { hotelId } : {}) },
      }),
    ]);

  const statusCount = (s: string) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;
  const hkCount = (s: string) => hkGroups.find((g) => g.housekeeping === s)?._count._all ?? 0;

  const occupiedRooms = statusCount("OCCUPIED");
  const reservedRooms = statusCount("RESERVED") + statusCount("AWAITING_CHECKIN") + statusCount("AWAITING_CHECKOUT");
  const outOfService = statusCount("MAINTENANCE") + statusCount("BLOCKED");
  const freeRooms = Math.max(0, totalRooms - occupiedRooms - reservedRooms - outOfService);

  return {
    totalRooms,
    freeRooms,
    occupiedRooms,
    reservedRooms,
    awaitingCheckin: statusCount("AWAITING_CHECKIN"),
    awaitingCheckout: statusCount("AWAITING_CHECKOUT"),
    maintenanceRooms: statusCount("MAINTENANCE"),
    blockedRooms: statusCount("BLOCKED"),
    housekeepingDirty: hkCount("DIRTY"),
    housekeepingClean: hkCount("CLEAN"),
    housekeepingInProgress: hkCount("IN_PROGRESS"),
    housekeepingPending: hkCount("CLEANING_PENDING") + hkCount("INSPECTION_PENDING"),
    arrivalsToday: arrivals,
    departuresToday: departures,
    inHouseGuests: inHouse,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    todayCollected: num(paymentsToday._sum.amount ?? 0),
    pendingPayment: financials.pending,
    totalBalance: financials.balance,
    activeReservations,
  };
}

/**
 * Receivables (cari) over active PMS bookings: grandTotal vs captured payments.
 * Excludes online hold/checkout states — those are gateway-managed.
 */
async function activeFinancials(hotelId?: string): Promise<{ pending: number; balance: number }> {
  const bookings = await db.booking.findMany({
    where: { status: { in: [...REVENANT_STATUSES] }, ...(hotelId ? { hotelId } : {}) },
    select: {
      grandTotal: true,
      payments: { where: { status: "PAID" }, select: { amount: true } },
    },
  });
  let balance = 0;
  let pending = 0;
  for (const b of bookings) {
    const paid = b.payments.reduce((s, p) => s + num(p.amount), 0);
    const due = num(b.grandTotal) - paid;
    if (due > 0.005) {
      balance += due;
      pending += 1;
    }
  }
  return { pending, balance: Math.round(balance * 100) / 100 };
}

// ── Charts data (last N days) ──

export type DailyOccupancyPoint = { date: string; rate: number; occupied: number; total: number };
export type DailyRevenuePoint = { date: string; collected: number; bookings: number };

export async function getChartSeries(days = 14, hotelId?: string): Promise<{
  occupancy: DailyOccupancyPoint[];
  revenue: DailyRevenuePoint[];
  paymentMix: { method: string; total: number }[];
}> {
  const today = utcToday();
  const start = new Date(`${addDaysStr(today, -(days - 1))}T00:00:00.000Z`);
  const end = new Date(`${today}T23:59:59.999Z`);

  const roomWhere = { isActive: true, ...(hotelId ? { hotelId } : {}) };
  const [totalRooms, bookings, payments] = await Promise.all([
    db.room.count({ where: roomWhere }),
    db.booking.findMany({
      where: { checkIn: { gte: start, lte: end }, status: { in: [...REVENANT_STATUSES, "CHECKED_OUT"] }, ...(hotelId ? { hotelId } : {}) },
      select: { checkIn: true, checkOut: true, grandTotal: true, createdAt: true, status: true },
    }),
    db.payment.findMany({
      where: { status: "PAID", capturedAt: { gte: start, lte: end }, ...(hotelId ? { booking: { hotelId } } : {}) },
      select: { amount: true, capturedAt: true, method: true, provider: true },
    }),
  ]);

  const occupancy: DailyOccupancyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const dateStr = addDaysStr(today, -(days - 1) + i);
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const occupied = bookings.filter((b) => {
      const ci = b.checkIn.toISOString().slice(0, 10);
      const co = b.checkOut.toISOString().slice(0, 10);
      return ci <= dateStr && dateStr < co;
    }).length;
    occupancy.push({
      date: dateStr,
      occupied,
      total: totalRooms,
      rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
    });
  }

  const revenue: DailyRevenuePoint[] = occupancy.map((o) => ({ date: o.date, collected: 0, bookings: 0 }));
  const dateIndex = new Map(revenue.map((r, i) => [r.date, i]));
  for (const b of bookings) {
    const created = b.createdAt.toISOString().slice(0, 10);
    const idx = dateIndex.get(created);
    const bucket = idx !== undefined ? revenue[idx] : undefined;
    if (bucket) {
      bucket.collected += num(b.grandTotal);
      bucket.bookings += 1;
    }
  }

  // Payment mix by manual method (gateway payments grouped under their provider)
  const mixMap = new Map<string, number>();
  for (const p of payments) {
    const key = p.method ?? p.provider;
    mixMap.set(key, (mixMap.get(key) ?? 0) + num(p.amount));
  }
  const paymentMix = [...mixMap.entries()].map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }));

  return { occupancy, revenue, paymentMix };
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
