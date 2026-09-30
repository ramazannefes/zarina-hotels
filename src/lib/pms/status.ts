// PMS status engine — derives physical-room states from bookings + assignments.
// The DB `Room.status` column caches the derived state; the source of truth is
// reservation data (this module). Manual overrides (MAINTENANCE/BLOCKED) shadow
// the computed status until released.

import type { PhysicalRoomStatus, HousekeepingStatus } from "@prisma/client";

// ── Labels (TR UI) ──

export const ROOM_STATUS_LABELS: Record<PhysicalRoomStatus, string> = {
  FREE: "BOŞ",
  RESERVED: "REZERVE",
  OCCUPIED: "DOLU",
  AWAITING_CHECKIN: "CHECK-IN BEKLİYOR",
  AWAITING_CHECKOUT: "CHECK-OUT BEKLİYOR",
  MAINTENANCE: "BAKIMDA",
  BLOCKED: "BLOKELİ",
};

export const HOUSEKEEPING_LABELS: Record<HousekeepingStatus, string> = {
  CLEAN: "TEMİZ",
  DIRTY: "KİRLİ",
  IN_PROGRESS: "TEMİZLENİYOR",
  CLEANING_PENDING: "TEMİZLİK BEKLİYOR",
  INSPECTION_PENDING: "KONTROL BEKLİYOR",
};

// Tailwind classes — compositor-friendly badge styling
export const ROOM_STATUS_CLASSES: Record<PhysicalRoomStatus, string> = {
  FREE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED: "bg-sea-100 text-sea-700 border-sea-300",
  OCCUPIED: "bg-gold-200/60 text-wine-700 border-gold-400",
  AWAITING_CHECKIN: "bg-amber-50 text-amber-700 border-amber-200",
  AWAITING_CHECKOUT: "bg-orange-50 text-orange-700 border-orange-200",
  MAINTENANCE: "bg-sand-100 text-ink-soft border-sand-300",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
};

export const HOUSEKEEPING_CLASSES: Record<HousekeepingStatus, string> = {
  CLEAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DIRTY: "bg-red-50 text-red-700 border-red-200",
  IN_PROGRESS: "bg-sea-100 text-sea-700 border-sea-300",
  CLEANING_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  INSPECTION_PENDING: "bg-gold-200/60 text-wine-700 border-gold-400",
};

// Statuses that make a room unsellable for new PMS reservations
export const BLOCKING_STATUSES: PhysicalRoomStatus[] = ["MAINTENANCE", "BLOCKED", "OCCUPIED", "AWAITING_CHECKIN"];

// ── Derived status computation ──

export type RoomStayContext = {
  /** Active PMS reservations overlapping today (non-cancelled/checked-out). */
  activeStays: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    status: string;
  }[];
};

/**
 * Compute the derived (system) status for a room for "today".
 * Priority: manual override → active stays → FREE.
 */
export function deriveRoomStatus(room: { status: PhysicalRoomStatus }, ctx: RoomStayContext): PhysicalRoomStatus {
  // Manual overrides shadow the computed status
  if (room.status === "MAINTENANCE" || room.status === "BLOCKED") return room.status;

  const today = utcToday();
  for (const stay of ctx.activeStays) {
    const ci = toDateOnlyStr(stay.checkIn);
    const co = toDateOnlyStr(stay.checkOut);
    if (ci <= today && today < co) {
      return stay.status === "CHECKED_IN" ? "OCCUPIED" : "RESERVED";
    }
  }
  // Arrivals today not yet checked in
  const arrivalToday = ctx.activeStays.find((s) => toDateOnlyStr(s.checkIn) === today);
  if (arrivalToday) return "AWAITING_CHECKIN";
  // Departures today (stays ending today without overlap — already covered above)
  return "FREE";
}

/** UTC "YYYY-MM-DD" for now — hotel ops treat dates as UTC date-only strings. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnlyStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Payment state derived from totals — never stored, always computed. */
export type PaymentState = "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";

export function derivePaymentState(paid: number, total: number): PaymentState {
  if (paid <= 0) return "UNPAID";
  if (paid < total - 0.005) return "PARTIAL";
  if (paid > total + 0.005) return "OVERPAID";
  return "PAID";
}

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  UNPAID: "Ödenmedi",
  PARTIAL: "Kısmi Ödeme",
  PAID: "Ödendi",
  OVERPAID: "Fazla Ödeme",
};
