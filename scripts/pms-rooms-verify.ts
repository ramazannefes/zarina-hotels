// Prod oda planı doğrulama. Usage: DATABASE_URL=<postgres> npx tsx scripts/pms-rooms-verify.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rooms = await db.room.findMany({
    select: { number: true, floor: true, status: true, housekeeping: true, isActive: true, roomType: { select: { code: true } } },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });
  const byFloor = new Map<number, { number: string; status: string; housekeeping: string; isActive: boolean; type: string }[]>();
  for (const r of rooms) {
    if (!byFloor.has(r.floor)) byFloor.set(r.floor, []);
    byFloor.get(r.floor)!.push({ number: r.number, status: r.status, housekeeping: r.housekeeping, isActive: r.isActive, type: r.roomType.code });
  }
  for (const [floor, list] of [...byFloor.entries()].sort((a, b) => (a[0] as number) - (b[0] as number))) {
    const line = list.map((r) => `${r.number}(${r.type})`).join(" ");
    console.log(`${floor}. kat (${list.length} oda): ${line}`);
  }
  console.log("Toplam:", rooms.length, "oda · Aktif:", rooms.filter((r) => r.isActive).length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
