// PMS service layer — all mutating operations with validation, transactions,
// conflict detection and audit logging. Frontend never performs these directly.

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { num } from "@/lib/pricing";
import type { Prisma, PhysicalRoomStatus, HousekeepingStatus, ManualPaymentMethod } from "@prisma/client";
import { utcToday } from "./status";

type Tx = Prisma.TransactionClient;

export class PmsError extends Error {
  constructor(
    public code:
      | "ROOM_NOT_FOUND"
      | "ROOM_UNAVAILABLE" // bakım/blokeli
      | "ROOM_CONFLICT" // çakışan rezervasyon
      | "CAPACITY_EXCEEDED"
      | "INVALID_DATES"
      | "INVALID_STATE" // check-in/out için uygun durum değil
      | "PROFILE_NOT_FOUND"
      | "PAYMENT_EXCEEDS_TOTAL"
      | "NEGATIVE_PAYMENT"
      | "HAS_ACTIVE_ASSIGNMENT"
      | "NOT_FOUND",
    public detail?: string,
  ) {
    super(code);
  }
}

const ACTIVE_STATUSES = ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] as const;
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export function validateStayDates(checkIn: string, checkOut: string): { checkIn: Date; checkOut: Date; nights: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    throw new PmsError("INVALID_DATES");
  }
  const ci = new Date(`${checkIn}T00:00:00.000Z`);
  const co = new Date(`${checkOut}T00:00:00.000Z`);
  if (Number.isNaN(ci.getTime()) || Number.isNaN(co.getTime())) throw new PmsError("INVALID_DATES");
  const nights = Math.round((co.getTime() - ci.getTime()) / 86_400_000);
  if (nights < 1) throw new PmsError("INVALID_DATES");
  return { checkIn: ci, checkOut: co, nights };
}

/**
 * Overlap check inside the caller's transaction (race-safe via row lock semantics
 * of SQLite/Postgres + unique constraint on assignment level checks).
 * Overlap rule: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
 */
export async function assertNoOverlap(
  tx: Tx,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  ignoreBookingId?: string,
): Promise<void> {
  const conflicts = await tx.roomAssignment.findMany({
    where: {
      roomId,
      isActive: true,
      booking: { status: { in: [...ACTIVE_STATUSES] } },
      ...(ignoreBookingId ? { bookingId: { not: ignoreBookingId } } : {}),
    },
    include: { booking: { select: { checkIn: true, checkOut: true, reference: true } } },
  });
  const overlapping = conflicts.filter(
    (a) => dateOnly(a.booking.checkIn) < dateOnly(checkOut) && dateOnly(a.booking.checkOut) > dateOnly(checkIn),
  );
  if (overlapping.length > 0) {
    throw new PmsError("ROOM_CONFLICT", overlapping.map((a) => a.booking.reference).join(", "));
  }
}

/** Room must exist, be active, and not be under maintenance/block. */
export async function assertRoomBookable(tx: Tx, roomId: string): Promise<void> {
  const room = await tx.room.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive) throw new PmsError("ROOM_NOT_FOUND");
  if (room.status === "MAINTENANCE" || room.status === "BLOCKED") {
    throw new PmsError("ROOM_UNAVAILABLE", room.blockReason ?? undefined);
  }
}

// ── Room assignment helpers ──

async function setRoomStatus(tx: Tx, roomId: string, status: PhysicalRoomStatus): Promise<void> {
  await tx.room.update({ where: { id: roomId }, data: { status } });
}

// ── Check-in ──

export async function performCheckIn(params: {
  bookingId: string;
  roomId?: string | null; // optional reassignment at check-in time
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { bookingId, roomId, adminId, ip } = params;
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { rooms: true, roomAssignments: { where: { isActive: true } } },
    });
    if (!booking) throw new PmsError("NOT_FOUND");
    if (booking.status !== "CONFIRMED" && booking.status !== "PMS_HOLD") {
      throw new PmsError("INVALID_STATE", booking.status);
    }

    // Resolve room: explicit → existing assignment → error
    let targetRoomId = roomId ?? booking.roomAssignments[0]?.roomId;
    if (!targetRoomId) throw new PmsError("ROOM_NOT_FOUND", "NO_ROOM_ASSIGNED");

    const existingAssignment = booking.roomAssignments.find((a) => a.roomId === targetRoomId);
    if (!existingAssignment && booking.roomAssignments.length > 0) {
      // Reassignment: release old rooms
      await tx.roomAssignment.updateMany({
        where: { bookingId: booking.id, isActive: true },
        data: { isActive: false, releasedAt: new Date() },
      });
    }
    if (!existingAssignment) {
      await assertRoomBookable(tx, targetRoomId);
      await assertNoOverlap(tx, targetRoomId, booking.checkIn, booking.checkOut);
      await tx.roomAssignment.create({
        data: { bookingId: booking.id, roomId: targetRoomId, isActive: true },
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CHECKED_IN" },
    });
    await setRoomStatus(tx, targetRoomId, "OCCUPIED");
  });

  await audit({
    adminId,
    action: "UPDATE",
    entity: "Booking",
    entityId: bookingId,
    metadata: { pms: "CHECK_IN", roomId: roomId ?? null },
    ip,
  });
  const { notifyAdmins } = await import("@/lib/notify");
  await notifyAdmins({ kind: "operation", title: "Check-in yapıldı", body: `Rezervasyon #${bookingId.slice(-6)} konaklamaya başladı.`, link: `/admin/pms/reservations/${bookingId}`, bookingId });
  return { ok: true };
}

// ── Check-out ──

export async function performCheckOut(params: {
  bookingId: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { bookingId, adminId, ip } = params;
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { roomAssignments: { where: { isActive: true } } },
    });
    if (!booking) throw new PmsError("NOT_FOUND");
    if (booking.status !== "CHECKED_IN") throw new PmsError("INVALID_STATE", booking.status);

    for (const assignment of booking.roomAssignments) {
      await tx.roomAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false, releasedAt: new Date() },
      });
      // Room becomes vacant but dirty — housekeeping must clean before FREE
      await tx.room.update({
        where: { id: assignment.roomId },
        data: { status: "FREE", housekeeping: "DIRTY" },
      });
    await tx.housekeepingTask.create({
      data: {
        roomId: assignment.roomId,
        bookingId: booking.id,
        type: "CLEANUP",
        status: "PENDING",
        note: "Check-out sonrası otomatik temizlik görevi",
      },
    });
    const { notifyAdmins } = await import("@/lib/notify");
    await notifyAdmins({ kind: "operation", title: "Temizlik görevi oluştu", body: `Oda #${assignment.roomId.slice(-4)} temizlenmeyi bekliyor.`, link: "/admin/pms/rooms?hk=1", bookingId });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CHECKED_OUT" },
    });
  });

  await audit({
    adminId,
    action: "UPDATE",
    entity: "Booking",
    entityId: bookingId,
    metadata: { pms: "CHECK_OUT" },
    ip,
  });
  const { notifyAdmins } = await import("@/lib/notify");
  await notifyAdmins({ kind: "operation", title: "Check-out yapıldı", body: `Rezervasyon #${bookingId.slice(-6)} tamamlandı. Oda temizlik listesine eklendi.`, link: `/admin/pms/reservations/${bookingId}`, bookingId });
  return { ok: true };
}

// ── PMS reservation creation (walk-in / phone / front desk) ──

export type CreatePmsReservationInput = {
  hotelId: string;
  roomId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children?: number;
  nightlyRate: number; // agreed nightly price (GEL)
  profile: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    identityNo?: string;
    nationality?: string;
    address?: string;
    notes?: string;
  };
  notes?: string;
  source?: string;
};

export async function createPmsReservation(
  input: CreatePmsReservationInput,
  admin: { id: string },
  ip?: string | null,
): Promise<{ bookingId: string; reference: string }> {
  const { checkIn, checkOut, nights } = validateStayDates(input.checkIn, input.checkOut);

  const reference = await uniquePmsReference();
  const bookingId = await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: input.roomId }, include: { roomType: true } });
    if (!room) throw new PmsError("ROOM_NOT_FOUND");
    await assertRoomBookable(tx, input.roomId);
    await assertNoOverlap(tx, input.roomId, checkIn, checkOut);

    const guests = input.adults + (input.children ?? 0);
    if (guests > room.roomType.maxGuests) throw new PmsError("CAPACITY_EXCEEDED", `${guests}/${room.roomType.maxGuests}`);

    // Reusable guest profile (upsert by email)
    const profile = await tx.guestProfile.upsert({
      where: { email: input.profile.email.trim().toLowerCase() },
      create: {
        email: input.profile.email.trim().toLowerCase(),
        firstName: input.profile.firstName.trim(),
        lastName: input.profile.lastName.trim(),
        phone: input.profile.phone,
        identityNo: input.profile.identityNo,
        nationality: input.profile.nationality,
        address: input.profile.address,
        notes: input.profile.notes,
      },
      update: {
        firstName: input.profile.firstName.trim(),
        lastName: input.profile.lastName.trim(),
        ...(input.profile.phone ? { phone: input.profile.phone } : {}),
        ...(input.profile.identityNo ? { identityNo: input.profile.identityNo } : {}),
        ...(input.profile.nationality ? { nationality: input.profile.nationality } : {}),
        ...(input.profile.address ? { address: input.profile.address } : {}),
      },
    });

    const roomsTotal = Math.round(input.nightlyRate * nights * 100) / 100;
    const bk = await tx.booking.create({
      data: {
        reference,
        hotelId: input.hotelId,
        status: "PMS_HOLD", // reception-held; confirm/check-in transitions explicit
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children ?? 0,
        nights,
        currency: "GEL",
        roomsTotal,
        grandTotal: roomsTotal,
        source: input.source ?? "admin",
        locale: "tr",
        internalNotes: input.notes,
        guest: {
          create: {
            firstName: input.profile.firstName.trim(),
            lastName: input.profile.lastName.trim(),
            email: input.profile.email.trim().toLowerCase(),
            phone: input.profile.phone ?? "",
            pmsProfileId: profile.id,
            isDemo: false,
          },
        },
        roomAssignments: {
          create: { roomId: input.roomId, isActive: true },
        },
      },
    });

    // RESERVED if future stay; AWAITING_CHECKIN if arriving today
    const today = utcToday();
    await setRoomStatus(tx, input.roomId, input.checkIn <= today ? "AWAITING_CHECKIN" : "RESERVED");
    return bk.id;
  });

  await audit({
    adminId: admin.id,
    action: "CREATE",
    entity: "Booking",
    entityId: bookingId,
    metadata: { pms: true, reference, roomId: input.roomId, checkIn: input.checkIn, checkOut: input.checkOut },
    ip,
  });
  const { notifyAdmins } = await import("@/lib/notify");
  await notifyAdmins({ kind: "reservation", title: `Yeni PMS rezervasyonu: ${reference}`, body: `${input.profile.firstName} ${input.profile.lastName} · ${input.checkIn} → ${input.checkOut}`, link: `/admin/pms/reservations/${bookingId}`, hotelId: input.hotelId, bookingId });
  return { bookingId, reference };
}

async function uniquePmsReference(attempt = 0): Promise<string> {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  const ref = `ZAR-${year}-${suffix}`;
  const existing = await db.booking.findUnique({ where: { reference: ref } });
  if (!existing) return ref;
  if (attempt > 5) throw new Error("REFERENCE_GEN_FAILED");
  return uniquePmsReference(attempt + 1);
}

// ── Reservation cancel ──

export async function cancelPmsReservation(params: {
  bookingId: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { bookingId, adminId, ip } = params;
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { roomAssignments: { where: { isActive: true } } },
    });
    if (!booking) throw new PmsError("NOT_FOUND");
    if (!["PMS_HOLD", "CONFIRMED"].includes(booking.status)) {
      throw new PmsError("INVALID_STATE", booking.status);
    }
    for (const a of booking.roomAssignments) {
      await tx.roomAssignment.update({ where: { id: a.id }, data: { isActive: false, releasedAt: new Date() } });
      await setRoomStatus(tx, a.roomId, "FREE");
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  });
  await audit({
    adminId,
    action: "BOOKING_CANCEL",
    entity: "Booking",
    entityId: bookingId,
    metadata: { pms: true },
    ip,
  });
  const { notifyAdmins } = await import("@/lib/notify");
  await notifyAdmins({ kind: "operation", title: "Rezervasyon iptal edildi", body: `#${bookingId.slice(-6)} iptal edildi, oda serbest bırakıldı.`, link: `/admin/pms/reservations/${bookingId}`, bookingId });
  return { ok: true };
}

// ── Manual room status override (maintenance / blocked / release) ──

export async function setRoomManualStatus(params: {
  roomId: string;
  status: PhysicalRoomStatus;
  blockReason?: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true; warning?: string }> {
  const { roomId, status, blockReason, adminId, ip } = params;
  let warning: string | undefined;

  await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { id: roomId },
      include: {
        assignments: {
          where: { isActive: true },
          include: { booking: { select: { reference: true, status: true, checkIn: true, checkOut: true } } },
        },
      },
    });
    if (!room) throw new PmsError("ROOM_NOT_FOUND");

    const today = utcToday();
    const activeStays = room.assignments.filter((a) => {
      const ci = dateOnly(a.booking.checkIn);
      const co = dateOnly(a.booking.checkOut);
      return ci <= today && today < co && a.booking.status !== "CANCELLED";
    });

    if ((status === "MAINTENANCE" || status === "BLOCKED") && activeStays.length > 0) {
      warning = `BU ODADA AKTİF KONAKLAMA VAR (${activeStays.map((a) => a.booking.reference).join(", ")}). Rezervasyonları önce taşıyın.`;
    }

    await tx.room.update({
      where: { id: roomId },
      data: {
        status,
        blockReason: status === "MAINTENANCE" || status === "BLOCKED" ? (blockReason ?? room.blockReason) : null,
      },
    });
    await tx.roomStatusLog.create({
      data: {
        roomId,
        adminId,
        fromStatus: room.status,
        toStatus: status,
        fromHousekeeping: room.housekeeping,
        toHousekeeping: room.housekeeping,
        note: blockReason,
      },
    });
  });

  await audit({
    adminId,
    action: "AVAILABILITY_CHANGE",
    entity: "Room",
    entityId: roomId,
    metadata: { status, reason: blockReason ?? null, warning: warning ?? null },
    ip,
  });
  return { ok: true, warning };
}

// ── Housekeeping ──

export async function setHousekeepingStatus(params: {
  roomId: string;
  housekeeping: HousekeepingStatus;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { roomId, housekeeping, adminId, ip } = params;
  await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } });
    if (!room) throw new PmsError("ROOM_NOT_FOUND");

    const data: Prisma.RoomUpdateInput = { housekeeping };
    if (housekeeping === "CLEAN") {
      data.lastCleanedAt = new Date();
      data.lastCleanedByAdminId = adminId;
    }
    await tx.room.update({ where: { id: roomId }, data });

    await tx.roomStatusLog.create({
      data: {
        roomId,
        adminId,
        fromStatus: room.status,
        toStatus: room.status,
        fromHousekeeping: room.housekeeping,
        toHousekeeping: housekeeping,
      },
    });

    // Complete pending cleanup tasks when marked CLEAN
    if (housekeeping === "CLEAN") {
      await tx.housekeepingTask.updateMany({
        where: { roomId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "DONE", completedAt: new Date() },
      });
    }
  });
  await audit({
    adminId,
    action: "UPDATE",
    entity: "Room",
    entityId: roomId,
    metadata: { housekeeping },
    ip,
  });
  return { ok: true };
}

export async function completeHousekeepingTask(params: {
  taskId: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { taskId, adminId, ip } = params;
  const task = await db.housekeepingTask.findUnique({ where: { id: taskId }, include: { room: true } });
  if (!task) throw new PmsError("NOT_FOUND");
  await db.$transaction([
    db.housekeepingTask.update({ where: { id: taskId }, data: { status: "DONE", completedAt: new Date() } }),
    db.room.update({
      where: { id: task.roomId },
      data: { housekeeping: "CLEAN", lastCleanedAt: new Date(), lastCleanedByAdminId: adminId },
    }),
  ]);
  await audit({ adminId, action: "UPDATE", entity: "HousekeepingTask", entityId: taskId, metadata: { done: true }, ip });
  return { ok: true };
}

// ── Manual payments (cash / POS / transfer at the front desk) ──

export async function addManualPayment(params: {
  bookingId: string;
  amount: number;
  method: ManualPaymentMethod;
  note?: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true; paymentId: string; balance: number }> {
  const { bookingId, amount, method, note, adminId, ip } = params;
  if (!Number.isFinite(amount) || amount <= 0) throw new PmsError("NEGATIVE_PAYMENT");

  const result = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { payments: { where: { status: "PAID" } } },
    });
    if (!booking) throw new PmsError("NOT_FOUND");
    const paid = booking.payments.reduce((s, p) => s + num(p.amount), 0);
    const balance = num(booking.grandTotal) - paid;
    // Overpayment is allowed only as exact-settle for change-giving workflows
    if (amount > balance + 0.005 && balance >= 0) {
      throw new PmsError("PAYMENT_EXCEEDS_TOTAL", `${amount} > ${balance}`);
    }
    const payment = await tx.payment.create({
      data: {
        bookingId,
        provider: "MANUAL",
        method,
        idempotencyKey: `manual-${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount,
        currency: booking.currency,
        status: "PAID",
        capturedAt: new Date(),
        failureReason: note ?? null,
      },
    });
    return { paymentId: payment.id, balance: Math.round((balance - amount) * 100) / 100 };
  });

  await audit({
    adminId,
    action: "CREATE",
    entity: "Payment",
    entityId: result.paymentId,
    metadata: { bookingId, amount, method, balanceAfter: result.balance },
    ip,
  });
  const { notifyAdmins } = await import("@/lib/notify");
  await notifyAdmins({ kind: "payment", title: `Ödeme tahsil edildi: ${amount} ₾`, body: `#${bookingId.slice(-6)} · kalan: ${result.balance} ₾`, link: `/admin/pms/reservations/${bookingId}`, bookingId });
  return { ok: true, ...result };
}

export async function deleteManualPayment(params: {
  paymentId: string;
  adminId: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const { paymentId, adminId, ip } = params;
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new PmsError("NOT_FOUND");
  if (payment.provider !== "MANUAL") throw new PmsError("INVALID_STATE", "GATEWAY_PAYMENT");
  await db.payment.delete({ where: { id: paymentId } });
  await audit({
    adminId,
    action: "DELETE",
    entity: "Payment",
    entityId: paymentId,
    metadata: { bookingId: payment.bookingId, amount: num(payment.amount), method: payment.method },
    ip,
  });
  return { ok: true };
}

/** Booking financials recomputed server-side (tahsilat / kalan / ödeme durumu). */
export async function getBookingFinancials(bookingId: string): Promise<{
  total: number;
  paid: number;
  balance: number;
  state: "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";
}> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { status: "PAID" } } },
  });
  if (!booking) throw new PmsError("NOT_FOUND");
  const total = num(booking.grandTotal);
  const paid = booking.payments.reduce((s, p) => s + num(p.amount), 0);
  const balance = Math.round((total - paid) * 100) / 100;
  const state = balance > 0.005 ? (paid > 0 ? "PARTIAL" : "UNPAID") : balance < -0.005 ? "OVERPAID" : "PAID";
  return { total, paid: Math.round(paid * 100) / 100, balance, state };
}
