"use server";

// PMS server actions — permission-checked mutations from the admin UI.
// Every action: getSessionAdmin → hasPermission → zod validation → service call → audit.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PhysicalRoomStatus, HousekeepingStatus, ManualPaymentMethod } from "@prisma/client";
import { getSessionAdmin, AuthError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  PmsError,
  performCheckIn,
  performCheckOut,
  cancelPmsReservation,
  createPmsReservation,
  setRoomManualStatus,
  setHousekeepingStatus,
  completeHousekeepingTask,
  addManualPayment,
  deleteManualPayment,
} from "@/lib/pms/service";
import { db } from "@/lib/db";

async function ctx(): Promise<{ adminId: string; ip: string | undefined }> {
  const admin = await getSessionAdmin();
  if (!admin) throw new AuthError("NOT_AUTHENTICATED");
  const h = await headers();
  return { adminId: admin.id, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined };
}

async function requirePms(permission: "pms.rooms.manage" | "pms.housekeeping" | "pms.checkin" | "pms.reservations" | "pms.payments" | "pms.guests") {
  const admin = await getSessionAdmin();
  if (!admin) throw new AuthError("NOT_AUTHENTICATED");
  if (!hasPermission(admin.role, permission)) throw new AuthError("FORBIDDEN", permission);
  const h = await headers();
  return { adminId: admin.id, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined };
}

function toUserMessage(err: unknown): string {
  if (err instanceof PmsError) {
    switch (err.code) {
      case "ROOM_NOT_FOUND": return "Oda bulunamadı.";
      case "ROOM_UNAVAILABLE": return `Oda müsait değil${err.detail ? `: ${err.detail}` : " (bakımda veya blokeli)"}.`;
      case "ROOM_CONFLICT": return `Bu odada seçilen tarihlerde çakışan rezervasyon var (${err.detail ?? ""}).`;
      case "CAPACITY_EXCEEDED": return `Kişi sayısı oda kapasitesini aşıyor (${err.detail ?? ""}).`;
      case "INVALID_DATES": return "Geçersiz tarih: çıkış tarihi girişten sonra olmalı.";
      case "INVALID_STATE": return "Bu işlem mevcut rezervasyon durumunda yapılamaz.";
      case "PROFILE_NOT_FOUND": return "Misafir profili bulunamadı.";
      case "PAYMENT_EXCEEDS_TOTAL": return `Ödeme kalan tutardan fazla olamaz (kalan: ${err.detail ?? ""}).`;
      case "NEGATIVE_PAYMENT": return "Ödeme tutarı sıfırdan büyük olmalı.";
      case "HAS_ACTIVE_ASSIGNMENT": return "Odada aktif konaklama var, işlem yapılamaz.";
      default: return "İşlem gerçekleştirilemedi.";
    }
  }
  if (err instanceof AuthError) {
    return err.code === "NOT_AUTHENTICATED" ? "Oturumunuz sona erdi, tekrar giriş yapın." : "Bu işlem için yetkiniz yok.";
  }
  return "Beklenmeyen bir hata oluştu, tekrar deneyin.";
}

export type ActionResult = { ok: true } | { ok: false; message: string };

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (err) {
    return { ok: false, message: toUserMessage(err) };
  }
}

// ── Room management ──

const roomSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().min(1),
  number: z.string().trim().min(1).max(10),
  floor: z.number().int().min(-2).max(50),
  notes: z.string().trim().max(500).optional(),
});

export async function createRoomAction(input: unknown): Promise<ActionResult & { id?: string }> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.rooms.manage");
    const data = roomSchema.parse(input);
    const room = await db.room.create({ data: { ...data, number: data.number.toUpperCase() } });
    await import("@/lib/audit").then((m) =>
      m.audit({ adminId, action: "CREATE", entity: "Room", entityId: room.id, metadata: { number: data.number }, ip }),
    );
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const, id: room.id };
  });
}

const roomUpdateSchema = z.object({
  id: z.string().min(1),
  number: z.string().trim().min(1).max(10).optional(),
  floor: z.number().int().min(-2).max(50).optional(),
  roomTypeId: z.string().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function updateRoomAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.rooms.manage");
    const data = roomUpdateSchema.parse(input);
    const { id, ...rest } = data;

    const room = await db.room.findUnique({ where: { id } });
    if (!room) return { ok: false as const, message: "Oda bulunamadı." };

    // Oda tipi aynı otelden mi? (çapraz otel atamasını engelle)
    if (rest.roomTypeId) {
      const roomType = await db.roomType.findUnique({ where: { id: rest.roomTypeId } });
      if (!roomType || roomType.hotelId !== room.hotelId) {
        return { ok: false as const, message: "Seçilen oda tipi bu otale ait değil." };
      }
    }

    // Oda numarası benzersiz mi? (aynı otelde başka odada kullanılıyor mu)
    if (rest.number) {
      const number = rest.number.toUpperCase();
      const clash = await db.room.findFirst({
        where: { hotelId: room.hotelId, number, id: { not: id } },
      });
      if (clash) {
        return { ok: false as const, message: `"${number}" numaralı oda zaten kayıtlı.` };
      }
      rest.number = number;
    }

    await db.room.update({ where: { id }, data: rest });
    await import("@/lib/audit").then((m) =>
      m.audit({ adminId, action: "UPDATE", entity: "Room", entityId: id, metadata: { ...rest }, ip }),
    );
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const };
  });
}

export async function deleteRoomAction(input: { id: string; hard?: boolean }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.rooms.manage");
    const { id, hard } = z.object({ id: z.string().min(1), hard: z.boolean().optional() }).parse(input);

    const room = await db.room.findUnique({
      where: { id },
      include: { assignments: { where: { isActive: true } } },
    });
    if (!room) return { ok: false as const, message: "Oda bulunamadı." };
    if (room.assignments.length > 0) {
      return { ok: false as const, message: "Odada aktif rezervasyon var; önce rezervasyonu taşıyın veya iptal edin." };
    }

    if (hard) {
      // Kalıcı silme: geçmiş atamalar SetNull değil Cascade — geçmişi korumak için
      // aktif ataması olmayan odada atamalar bırakılır, loglar kalır.
      await db.roomAssignment.deleteMany({ where: { roomId: id, isActive: false } });
      await db.housekeepingTask.deleteMany({ where: { roomId: id } });
      await db.room.delete({ where: { id } });
    } else {
      await db.room.update({ where: { id }, data: { isActive: false } });
    }
    await import("@/lib/audit").then((m) =>
      m.audit({ adminId, action: "DELETE", entity: "Room", entityId: id, metadata: { number: room.number, hard: hard ?? false }, ip }),
    );
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const };
  });
}

export async function setRoomStatusAction(input: {
  roomId: string;
  status: PhysicalRoomStatus;
  blockReason?: string;
}): Promise<ActionResult & { warning?: string }> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.rooms.manage");
    const parsed = z
      .object({
        roomId: z.string().min(1),
        status: z.enum(["FREE", "RESERVED", "OCCUPIED", "AWAITING_CHECKIN", "AWAITING_CHECKOUT", "MAINTENANCE", "BLOCKED"]),
        blockReason: z.string().trim().max(300).optional(),
      })
      .parse(input);
    const result = await setRoomManualStatus({ ...parsed, adminId, ip });
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const, warning: result.warning };
  });
}

// ── Housekeeping ──

export async function setHousekeepingAction(input: {
  roomId: string;
  housekeeping: HousekeepingStatus;
}): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.housekeeping");
    const parsed = z
      .object({ roomId: z.string().min(1), housekeeping: z.enum(["CLEAN", "DIRTY", "IN_PROGRESS", "CLEANING_PENDING", "INSPECTION_PENDING"]) })
      .parse(input);
    await setHousekeepingStatus({ ...parsed, adminId, ip });
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const };
  });
}

export async function completeTaskAction(input: { taskId: string }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.housekeeping");
    const { taskId } = z.object({ taskId: z.string().min(1) }).parse(input);
    await completeHousekeepingTask({ taskId, adminId, ip });
    revalidatePath("/admin/pms");
    revalidatePath("/admin/pms/rooms");
    return { ok: true as const };
  });
}

// ── Check-in / Check-out ──

export async function checkInAction(input: { bookingId: string; roomId?: string }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.checkin");
    const parsed = z
      .object({ bookingId: z.string().min(1), roomId: z.string().min(1).optional() })
      .parse(input);
    await performCheckIn({ ...parsed, adminId, ip });
    revalidatePath("/admin/pms");
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms/reservations");
    revalidatePath(`/admin/pms/reservations/${parsed.bookingId}`);
    return { ok: true as const };
  });
}

export async function checkOutAction(input: { bookingId: string }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.checkin");
    const { bookingId } = z.object({ bookingId: z.string().min(1) }).parse(input);
    await performCheckOut({ bookingId, adminId, ip });
    revalidatePath("/admin/pms");
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms/reservations");
    revalidatePath(`/admin/pms/reservations/${bookingId}`);
    return { ok: true as const };
  });
}

// ── PMS reservations ──

const reservationSchema = z.object({
  hotelId: z.string().min(1),
  roomId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(6).default(0),
  nightlyRate: z.number().positive().max(1_000_000),
  profile: z.object({
    email: z.string().email(),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: z.string().trim().max(30).optional(),
    identityNo: z.string().trim().max(30).optional(),
    nationality: z.string().trim().max(60).optional(),
    address: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(300).optional(),
  }),
  notes: z.string().trim().max(500).optional(),
});

export async function createReservationAction(input: unknown): Promise<ActionResult & { reference?: string; bookingId?: string }> {
  return run(async () => {
    await requirePms("pms.reservations");
    const data = reservationSchema.parse(input);
    const admin = await getSessionAdmin();
    if (!admin) throw new AuthError("NOT_AUTHENTICATED");
    const h = await headers();
    const result = await createPmsReservation(data, { id: admin.id }, h.get("x-forwarded-for")?.split(",")[0]?.trim());
    revalidatePath("/admin/pms/reservations");
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const, reference: result.reference, bookingId: result.bookingId };
  });
}

export async function cancelReservationAction(input: { bookingId: string }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.reservations");
    const { bookingId } = z.object({ bookingId: z.string().min(1) }).parse(input);
    await cancelPmsReservation({ bookingId, adminId, ip });
    revalidatePath("/admin/pms/reservations");
    revalidatePath("/admin/pms/rooms");
    revalidatePath("/admin/pms");
    return { ok: true as const };
  });
}

export async function updateBookingNotesAction(input: { bookingId: string; notes: string }): Promise<ActionResult> {
  return run(async () => {
    await requirePms("pms.reservations");
    const { bookingId, notes } = z
      .object({ bookingId: z.string().min(1), notes: z.string().trim().max(1000) })
      .parse(input);
    await db.booking.update({ where: { id: bookingId }, data: { internalNotes: notes } });
    revalidatePath(`/admin/pms/reservations/${bookingId}`);
    return { ok: true as const };
  });
}

// ── Manual payments ──

export async function addPaymentAction(input: {
  bookingId: string;
  amount: number;
  method: ManualPaymentMethod;
  note?: string;
}): Promise<ActionResult & { balance?: number }> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.payments");
    const parsed = z
      .object({
        bookingId: z.string().min(1),
        amount: z.number().positive().max(1_000_000),
        method: z.enum(["CASH", "CREDIT_CARD", "BANK_TRANSFER", "WIRE", "OTHER"]),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input);
    const result = await addManualPayment({ ...parsed, adminId, ip });
    revalidatePath(`/admin/pms/reservations/${parsed.bookingId}`);
    revalidatePath("/admin/pms");
    return { ok: true as const, balance: result.balance };
  });
}

export async function deletePaymentAction(input: { paymentId: string; bookingId: string }): Promise<ActionResult> {
  return run(async () => {
    const { adminId, ip } = await requirePms("pms.payments");
    const { paymentId, bookingId } = z.object({ paymentId: z.string().min(1), bookingId: z.string().min(1) }).parse(input);
    await deleteManualPayment({ paymentId, adminId, ip });
    revalidatePath(`/admin/pms/reservations/${bookingId}`);
    revalidatePath("/admin/pms");
    return { ok: true as const };
  });
}

// ── Guests ──

const guestSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional(),
  identityNo: z.string().trim().max(30).optional(),
  nationality: z.string().trim().max(60).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function upsertGuestAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await requirePms("pms.guests");
    const data = guestSchema.parse(input);
    const email = data.email.toLowerCase();
    await db.guestProfile.upsert({
      where: { email },
      create: {
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        identityNo: data.identityNo,
        nationality: data.nationality,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        address: data.address,
        notes: data.notes,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        identityNo: data.identityNo,
        nationality: data.nationality,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        address: data.address,
        notes: data.notes,
      },
    });
    revalidatePath("/admin/pms/guests");
    return { ok: true as const };
  });
}
