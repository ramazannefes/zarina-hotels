// Otel konum verisi — koordinat + Google Maps embed URL.
// Usage: DATABASE_URL=<postgres-or-sqlite> npx tsx scripts/set-location.ts
//
// Zarina Hotels & Hamam — Mayakovsky Street 11, 6010 Batumi, Adjara, Georgia
// Koordinatlar: Mayakovsky St 11, Batumi (yaklaşık, Google Maps adres çözümlemesi)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Mayakovsky Street 11, Batumi — Google Maps: 41.6461° N, 41.6360° E yakını
const LAT = 41.6461;
const LNG = 41.636;

const MAP_EMBED =
  "https://www.google.com/maps?q=Zarina+Hotels+%26+Hamam,+Mayakovsky+Street+11,+Batumi,+Georgia&output=embed";

async function main() {
  const hotels = await db.hotel.findMany({ select: { id: true, slug: true, name: true } });
  for (const h of hotels) {
    await db.hotel.update({
      where: { id: h.id },
      data: { latitude: LAT, longitude: LNG, mapEmbedUrl: MAP_EMBED },
    });
    console.log(`✓ ${h.name} (${h.slug}): geo + harita güncellendi`);
  }
  const check = await db.hotel.findFirst({ select: { name: true, latitude: true, longitude: true, mapEmbedUrl: true } });
  console.log("Doğrulama:", JSON.stringify(check, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
