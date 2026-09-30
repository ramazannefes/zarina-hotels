// Prod/diğer ortamlar için oda planı seed'i — SADECE odalar, demo rezervasyon YOK.
// Usage: DATABASE_URL=<postgres-or-sqlite> npx tsx scripts/pms-rooms-seed.ts
//
// Room plan:
//   1. kat: 201–208 → DBL-STD (Standard Double)
//   2. kat: 301–311 → DBL-CMF (Comfort Double)
//   3. kat: 401–404 FAM-3 · 405–406 SGL-PRM · 407–410 JST · 411–414 FST
//
// Idempotent: mevcut odaları günceller (kat/tip/aktif), yeni olanları ekler.
// Odaların durumu/temizlik durumu değiştirilmez; admin panelindeki düzenlemeler korunur.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function buildRoomDefs(): { number: string; floor: number; typeCode: string }[] {
  const defs: { number: string; floor: number; typeCode: string }[] = [];
  for (let n = 201; n <= 208; n++) defs.push({ number: String(n), floor: 1, typeCode: "DBL-STD" });
  for (let n = 301; n <= 311; n++) defs.push({ number: String(n), floor: 2, typeCode: "DBL-CMF" });
  for (let n = 401; n <= 414; n++) {
    const idx = n - 401;
    const typeCode = idx < 4 ? "FAM-3" : idx < 6 ? "SGL-PRM" : idx < 10 ? "JST" : "FST";
    defs.push({ number: String(n), floor: 3, typeCode });
  }
  return defs;
}

async function main() {
  const hotel = await db.hotel.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  if (!hotel) {
    console.error("Aktif otel bulunamadı. Önce npm run db:seed çalıştırın.");
    process.exit(1);
  }

  console.info(`Oda planı uygulanıyor → ${hotel.name}…`);

  let created = 0;
  let updated = 0;
  for (const def of buildRoomDefs()) {
    const roomType = await db.roomType.findUnique({
      where: { hotelId_code: { hotelId: hotel.id, code: def.typeCode } },
    });
    if (!roomType) {
      console.warn(`  ⚠ Oda tipi bulunamadı: ${def.typeCode} — ${def.number} atlandı`);
      continue;
    }
    const result = await db.room.upsert({
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
    // upsert sonrası var mıydı ayırt etmek için count karşılaştırması
    const before = await db.room.count({ where: { hotelId: hotel.id, number: def.number, createdAt: result.createdAt } });
    if (before === 1 && result.updatedAt.getTime() - result.createdAt.getTime() < 1500) created++;
    else updated++;
  }

  const total = await db.room.count({ where: { hotelId: hotel.id } });
  console.info(`Tamamlandı: ${total} oda (yaklaşık ${created} yeni, ${updated} güncellendi).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
