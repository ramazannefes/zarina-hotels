import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "analytics.view")) redirect("/admin/no-access");

  const since = new Date(Date.now() - 30 * 86_400_000);

  const [bySource, topRooms, cancellations, avgValue, confirmedAgg] = await Promise.all([
    db.booking.groupBy({ by: ["source"], where: { status: "CONFIRMED", createdAt: { gte: since } }, _count: true, _sum: { grandTotal: true } }),
    db.bookingRoom.groupBy({ by: ["roomTypeId"], _count: true, _sum: { roomsSubtotal: true } }),
    db.booking.count({ where: { status: "CANCELLED", createdAt: { gte: since } } }),
    db.booking.aggregate({ where: { status: "CONFIRMED", createdAt: { gte: since } }, _avg: { grandTotal: true }, _count: true }),
    db.booking.aggregate({ where: { status: "CONFIRMED", createdAt: { gte: since } }, _sum: { grandTotal: true } }),
  ]);

  const roomIds = topRooms.map((r) => r.roomTypeId);
  const rooms = roomIds.length > 0 ? await db.roomType.findMany({ where: { id: { in: roomIds } }, select: { id: true, name: true } }) : [];
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Analytics</p>
      <h1 className="mt-1 font-display text-3xl">Revenue · last 30 days</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest2 text-ink-muted">Confirmed revenue</p>
          <p className="mt-2 font-display text-3xl text-gold-600">{formatMoney(Number(confirmedAgg._sum.grandTotal ?? 0))}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest2 text-ink-muted">Avg booking value</p>
          <p className="mt-2 font-display text-3xl text-gold-600">{formatMoney(Number(avgValue._avg.grandTotal ?? 0))}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-widest2 text-ink-muted">Cancellations</p>
          <p className="mt-2 font-display text-3xl text-wine-600">{cancellations}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-xl">Booking source</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {bySource.map((s) => (
              <li key={s.source} className="flex items-center justify-between border-b border-sand-100 pb-2">
                <span className="capitalize">{s.source}</span>
                <span>
                  {s._count} bookings · {formatMoney(Number(s._sum.grandTotal ?? 0))}
                </span>
              </li>
            ))}
            {bySource.length === 0 && <li className="text-xs text-ink-muted">No confirmed bookings in period.</li>}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-xl">Most booked rooms (all time)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {topRooms.slice(0, 8).map((r) => (
              <li key={r.roomTypeId} className="flex items-center justify-between border-b border-sand-100 pb-2">
                <span>{roomName(r.roomTypeId)}</span>
                <span>{r._count} · {formatMoney(Number(r._sum.roomsSubtotal ?? 0))}</span>
              </li>
            ))}
            {topRooms.length === 0 && <li className="text-xs text-ink-muted">No data yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
