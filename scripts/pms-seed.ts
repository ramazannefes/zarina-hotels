// PMS demo data seed — physical rooms + demo stays for local development.
// Usage: npm run pms:seed
//
// Room plan (real hotel layout):
//   1. floor: 201–208 (Standard Double)
//   2. floor: 301–311 (Comfort Double)
//   3. floor: 401–414 (Family / Single / Junior Suite / Family Suite mix)
//
// The script RESETS demo PMS data first: bookings marked with the demo note
// ("PMS demo rezervasyonu") and their payments/assignments are deleted, then
// rooms are rebuilt to match the plan above. Bookings created manually from
// the admin panel (different/absent internal note) are preserved.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_NOTE = "PMS demo rezervasyonu";

// Deterministic pseudo-random (reproducible reference suffixes)
let seedState = 987654321;
function rand(): number {
  // SplitMix32-style step to stay inside safe integer range
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = seedState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Room plan: floor → (number range, room type code per room). */
function buildRoomDefs(): { number: string; floor: number; typeCode: string }[] {
  const defs: { number: string; floor: number; typeCode: string }[] = [];
  // 1. kat: 201–208 standart
  for (let n = 201; n <= 208; n++) defs.push({ number: String(n), floor: 1, typeCode: "DBL-STD" });
  // 2. kat: 301–311 comfort
  for (let n = 301; n <= 311; n++) defs.push({ number: String(n), floor: 2, typeCode: "DBL-CMF" });
  // 3. kat: 401–414 → Comfort Triple (SGL-PRM) ×6, JST ×4, FST ×4 (referans plan)
  for (let n = 401; n <= 414; n++) {
    const idx = n - 401;
    const typeCode = idx < 6 ? "SGL-PRM" : idx < 10 ? "JST" : "FST";
    defs.push({ number: String(n), floor: 3, typeCode });
  }
  return defs;
}

async function main() {
  const hotel = await db.hotel.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  if (!hotel) {
    console.error("Önce ana seed'i çalıştırın: npm run db:seed");
    process.exit(1);
  }

  console.info(`PMS demo seed → ${hotel.name}…`);

  // ── 0) Reset previous DEMO PMS data (marked bookings only) ──
  const demoBookings = await db.booking.findMany({
    where: { hotelId: hotel.id, internalNotes: DEMO_NOTE },
    select: { id: true },
  });
  const demoIds = demoBookings.map((b) => b.id);
  if (demoIds.length > 0) {
    await db.payment.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.bookingRoom.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.bookingExtra.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.promotionUsage.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.housekeepingTask.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.roomAssignment.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.emailLog.deleteMany({ where: { bookingId: { in: demoIds } } });
    await db.booking.deleteMany({ where: { id: { in: demoIds } } });
    console.info(`  ${demoIds.length} eski demo rezervasyon temizlendi.`);
  }

  // Rooms without an active assignment are safe to rebuild.
  // (A manually created booking that still holds a room keeps that room.)
  const deleted = await db.room.deleteMany({
    where: { hotelId: hotel.id, assignments: { none: { isActive: true } } },
  });
  if (deleted.count > 0) console.info(`  ${deleted.count} eski oda kaydı kaldırıldı.`);

  const kept = await db.room.count({
    where: { hotelId: hotel.id, assignments: { some: { isActive: true } } },
  });
  if (kept > 0) console.warn(`  ⚠ ${kept} oda aktif rezervasyonu nedeniyle korundu (yeniden numaralandırılmadı).`);

  // ── 1) Physical rooms per plan (idempotent by hotelId+number) ──
  const createdRooms = new Map<string, string>(); // number → id
  for (const def of buildRoomDefs()) {
    const roomType = await db.roomType.findUnique({
      where: { hotelId_code: { hotelId: hotel.id, code: def.typeCode } },
    });
    if (!roomType) {
      console.warn(`  ⚠ Oda tipi bulunamadı: ${def.typeCode} (${def.number} atlandı)`);
      continue;
    }
    const room = await db.room.upsert({
      where: { hotelId_number: { hotelId: hotel.id, number: def.number } },
      update: { floor: def.floor, roomTypeId: roomType.id, isActive: true },
      create: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        number: def.number,
        floor: def.floor,
        status: "FREE",
        housekeeping: "CLEAN",
      },
    });
    createdRooms.set(def.number, room.id);
  }
  console.info(`  ${createdRooms.size} oda hazırlandı (201–208, 301–311, 401–414).`);

  // ── 2) Demo guest profiles ──
  const guestDefs = [
    { firstName: "Ahmet", lastName: "Yılmaz", email: "ahmet.yilmaz@example.com", phone: "+90 532 000 0001", nationality: "TC", identityNo: "12345678901" },
    { firstName: "Mehmet", lastName: "Kaya", email: "mehmet.kaya@example.com", phone: "+90 532 000 0002", nationality: "TC" },
    { firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@example.com", phone: "+44 7700 900123", nationality: "GB" },
    { firstName: "Nino", lastName: "Beridze", email: "nino.beridze@example.com", phone: "+995 599 000 004", nationality: "GE" },
    { firstName: "Elif", lastName: "Demir", email: "elif.demir@example.com", phone: "+90 532 000 0005", nationality: "TC" },
  ];
  const profiles = [];
  for (const g of guestDefs) {
    const p = await db.guestProfile.upsert({
      where: { email: g.email },
      update: {},
      create: g,
    });
    profiles.push(p);
  }

  // ── 3) Demo reservations with assignments ──
  const scenarios: {
    roomNumber: string;
    profileIdx: number;
    ci: number; // day offset from today (check-in)
    co: number; // day offset (check-out)
    adults: number;
    children: number;
    status: "PMS_HOLD" | "CONFIRMED" | "CHECKED_IN";
    paidRatio: number;
  }[] = [
    { roomNumber: "201", profileIdx: 0, ci: -1, co: 2, adults: 2, children: 0, status: "CHECKED_IN", paidRatio: 0.6 },
    { roomNumber: "202", profileIdx: 1, ci: 0, co: 3, adults: 2, children: 1, status: "CONFIRMED", paidRatio: 0.5 },
    { roomNumber: "203", profileIdx: 2, ci: -2, co: 0, adults: 2, children: 0, status: "CHECKED_IN", paidRatio: 1 },
    { roomNumber: "205", profileIdx: 3, ci: 2, co: 5, adults: 2, children: 0, status: "CONFIRMED", paidRatio: 0 },
    { roomNumber: "302", profileIdx: 4, ci: 0, co: 2, adults: 1, children: 0, status: "PMS_HOLD", paidRatio: 0 },
    { roomNumber: "305", profileIdx: 0, ci: 5, co: 8, adults: 2, children: 0, status: "CONFIRMED", paidRatio: 0.3 },
    { roomNumber: "401", profileIdx: 2, ci: -1, co: 1, adults: 2, children: 1, status: "CHECKED_IN", paidRatio: 0.8 },
    { roomNumber: "404", profileIdx: 1, ci: 3, co: 6, adults: 2, children: 0, status: "CONFIRMED", paidRatio: 0 },
  ];

  let created = 0;
  let seq = 0;
  for (const s of scenarios) {
    const roomId = createdRooms.get(s.roomNumber);
    if (!roomId) continue;
    const profile = profiles[s.profileIdx];
    if (!profile) continue;

    const ci = dateStr(s.ci);
    const co = dateStr(s.co);
    const nights = s.co - s.ci;
    const room = await db.room.findUnique({ where: { id: roomId }, include: { roomType: true } });
    if (!room) continue;
    const nightly = Number(room.roomType.basePrice);
    const total = Math.round(nightly * nights * 100) / 100;

    const reference = await uniqueReference();
    const booking = await db.booking.create({
      data: {
        reference,
        hotelId: hotel.id,
        status: s.status,
        checkIn: new Date(ci),
        checkOut: new Date(co),
        adults: s.adults,
        children: s.children,
        nights,
        currency: "GEL",
        roomsTotal: total,
        grandTotal: total,
        source: "admin",
        locale: "tr",
        internalNotes: DEMO_NOTE,
        guest: {
          create: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone ?? "",
            pmsProfileId: profile.id,
          },
        },
        roomAssignments: { create: { roomId, isActive: true } },
      },
    });

    if (s.paidRatio > 0) {
      const amount = Math.round(total * s.paidRatio * 100) / 100;
      await db.payment.create({
        data: {
          bookingId: booking.id,
          provider: "MANUAL",
          method: "CASH",
          idempotencyKey: `seed-${booking.id}-${seq++}`,
          amount,
          currency: "GEL",
          status: "PAID",
          capturedAt: new Date(),
        },
      });
    }

    // Room status according to stay state
    const today = dateStr(0);
    if (s.status === "CHECKED_IN") {
      await db.room.update({ where: { id: roomId }, data: { status: "OCCUPIED", housekeeping: "CLEAN" } });
    } else if (ci <= today) {
      await db.room.update({ where: { id: roomId }, data: { status: "AWAITING_CHECKIN" } });
    } else {
      await db.room.update({ where: { id: roomId }, data: { status: "RESERVED" } });
    }

    created++;
  }

  // ── 4) Housekeeping / maintenance demo states ──
  const dirtyRoomId = createdRooms.get("407"); // JST — check-out yapılmış gibi kirli
  if (dirtyRoomId) {
    await db.room.update({ where: { id: dirtyRoomId }, data: { status: "FREE", housekeeping: "DIRTY" } });
    await db.housekeepingTask.create({
      data: { roomId: dirtyRoomId, type: "CLEANUP", status: "PENDING", note: "Demo temizlik görevi" },
    });
  }
  const maintRoomId = createdRooms.get("408"); // JST — bakımda
  if (maintRoomId) {
    await db.room.update({ where: { id: maintRoomId }, data: { status: "MAINTENANCE", blockReason: "Klima arızası (demo)" } });
  }

  console.info(`  ${created} demo rezervasyon, 1 kirli oda (407), 1 bakımda oda (408).`);
  console.info("PMS demo seed tamamlandı. Admin panelinden /admin/pms ekranını kontrol edin.");
}

const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function uniqueReference(attempt = 0): Promise<string> {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += REF_CHARS[Math.floor(rand() * REF_CHARS.length)];
  const ref = `ZAR-${new Date().getFullYear()}-${suffix}`;
  const existing = await db.booking.findUnique({ where: { reference: ref } });
  if (!existing) return ref;
  if (attempt > 10) throw new Error("REFERENCE_GEN_FAILED");
  return uniqueReference(attempt + 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
