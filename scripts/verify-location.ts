// Verify hotel geo/map data (prod schema, postgres). One-shot; prints and exits.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const hotels = await db.hotel.findMany({
    select: { name: true, slug: true, latitude: true, longitude: true, mapEmbedUrl: true, address: true },
  });
  for (const h of hotels) {
    console.log(`${h.name} (${h.slug})`);
    console.log(`  address : ${h.address}`);
    console.log(`  geo     : ${h.latitude}, ${h.longitude}`);
    console.log(`  mapUrl  : ${h.mapEmbedUrl ? "SET" : "NULL"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
