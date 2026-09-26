import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import CalendarGrid from "@/components/admin/CalendarGrid";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "rates.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const startDate = typeof sp.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : new Date().toISOString().slice(0, 10);
  const days = 21;

  const rooms = await db.roomType.findMany({
    where: { isActive: true },
    orderBy: [{ hotelId: "asc" }, { sortOrder: "asc" }],
    include: { hotel: { select: { name: true } } },
  });

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start.getTime() + days * 86_400_000);

  const [inventory, rates] = await Promise.all([
    db.roomInventory.findMany({
      where: { roomTypeId: { in: rooms.map((r) => r.id) }, date: { gte: start, lt: end } },
    }),
    db.dailyRate.findMany({
      where: { roomTypeId: { in: rooms.map((r) => r.id) }, date: { gte: start, lt: end } },
    }),
  ]);

  const invMap: Record<string, { inventory: number; booked: number; held: number; stopSell: boolean }> = {};
  for (const inv of inventory) {
    invMap[`${inv.roomTypeId}|${inv.date.toISOString().slice(0, 10)}`] = {
      inventory: inv.inventory,
      booked: inv.bookedCount,
      held: inv.heldCount,
      stopSell: inv.stopSell,
    };
  }
  const rateMap: Record<string, { price: number; minStay: number | null }> = {};
  for (const r of rates) {
    rateMap[`${r.roomTypeId}|${r.date.toISOString().slice(0, 10)}`] = { price: Number(r.price), minStay: r.minStay };
  }

  const canEdit = hasPermission(admin.role, "rates.edit") || hasPermission(admin.role, "availability.edit");

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Rates & Availability</p>
          <h1 className="mt-1 font-display text-3xl">Inventory calendar</h1>
        </div>
        <form action="/admin/calendar" className="flex items-end gap-2">
          <div>
            <label htmlFor="start" className="label">Start date</label>
            <input id="start" name="start" type="date" defaultValue={startDate} className="input !py-2" />
          </div>
          <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">Go</button>
        </form>
      </div>

      <CalendarGrid
        startDate={startDate}
        days={days}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, hotel: r.hotel.name, basePrice: Number(r.basePrice), inventoryCount: r.inventoryCount }))}
        invMap={invMap}
        rateMap={rateMap}
        canEdit={canEdit}
      />
    </div>
  );
}
