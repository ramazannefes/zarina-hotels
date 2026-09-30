// PMS seed doğrulama — kat/koda göre oda planını yazdırır. Usage: npx tsx scripts/pms-verify.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rooms = await db.room.findMany({
    select: { number: true, floor: true, status: true, housekeeping: true },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });
  const byFloor = new Map<number, { number: string; status: string; housekeeping: string }[]>();
  for (const r of rooms) {
    if (!byFloor.has(r.floor)) byFloor.set(r.floor, []);
    byFloor.get(r.floor)!.push(r);
  }
  for (const [floor, list] of [...byFloor.entries()].sort((a, b) => (a[0] as number) - (b[0] as number))) {
    const line = list
      .map((r) => {
        const tag = r.status === "FREE" ? "" : `[${r.status.slice(0, 4)}]`;
        const hk = r.housekeeping !== "CLEAN" ? `(${r.housekeeping.slice(0, 2)})` : "";
        return `${r.number}${tag}${hk}`;
      })
      .join(" ");
    console.log(`${floor}. kat (${list.length} oda): ${line}`);
  }
  const statuses = await db.room.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("Durum dağılımı:", statuses.map((s) => `${s.status}=${s._count._all}`).join(", "));
  const demoBookings = await db.booking.count({ where: { internalNotes: "PMS demo rezervasyonu" } });
  console.log("Demo rezervasyon sayısı:", demoBookings);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
