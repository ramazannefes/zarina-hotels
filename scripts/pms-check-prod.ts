// Prod kontrol: oda tipleri ve oteller. Usage: DATABASE_URL=<postgres> npx tsx scripts/pms-check-prod.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const hotels = await db.hotel.findMany({ select: { id: true, name: true, isActive: true } });
  console.log("Oteller:", hotels.map((h) => `${h.name} [${h.id}] (${h.isActive ? "aktif" : "pasif"})`).join(" | ") || "yok");
  const roomTypes = await db.roomType.findMany({
    select: { id: true, code: true, name: true, hotelId: true, maxGuests: true, isActive: true },
    orderBy: [{ hotelId: "asc" }, { sortOrder: "asc" }],
  });
  console.log("Oda tipleri:");
  for (const rt of roomTypes) {
    console.log(`  ${rt.code} — ${rt.name} · ${rt.maxGuests} kişi · otel ${rt.hotelId.slice(-6)} · ${rt.isActive ? "aktif" : "pasif"} [${rt.id}]`);
  }
  const roomCount = await db.room.count();
  console.log("Mevcut fiziksel oda sayısı:", roomCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
