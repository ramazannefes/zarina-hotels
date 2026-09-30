import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getDashboardStats, getChartSeries } from "@/lib/pms/queries";
import {
  ROOM_STATUS_LABELS,
  HOUSEKEEPING_LABELS,
  HOUSEKEEPING_CLASSES,
} from "@/lib/pms/status";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PmsDashboardPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const [stats, charts, arrivals, departures, dirtyRooms, blockedRooms] = await Promise.all([
    getDashboardStats(),
    getChartSeries(14),
    db.booking.findMany({
      where: { status: { in: ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] }, checkIn: { gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z") } },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        roomAssignments: { where: { isActive: true }, include: { room: { select: { number: true } } } },
        payments: { where: { status: "PAID" }, select: { amount: true } },
      },
      orderBy: { checkIn: "asc" },
      take: 10,
    }),
    db.booking.findMany({
      where: { status: { in: ["CHECKED_IN"] }, checkOut: { gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"), lt: new Date(new Date().toISOString().slice(0, 10) + "T23:59:59.999Z") } },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        roomAssignments: { where: { isActive: true }, include: { room: { select: { number: true } } } },
        payments: { where: { status: "PAID" }, select: { amount: true } },
      },
      orderBy: { checkOut: "asc" },
      take: 10,
    }),
    db.room.findMany({
      where: { isActive: true, housekeeping: { not: "CLEAN" } },
      include: { roomType: { select: { name: true } } },
      orderBy: { number: "asc" },
      take: 12,
    }),
    db.room.findMany({
      where: { isActive: true, status: { in: ["MAINTENANCE", "BLOCKED"] } },
      include: { roomType: { select: { name: true } } },
      orderBy: { number: "asc" },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const cards = [
    { label: "Toplam Oda", value: stats.totalRooms, href: "/admin/pms/rooms", tone: "text-ink" },
    { label: "Dolu", value: stats.occupiedRooms, href: "/admin/pms/rooms", tone: "text-wine-600" },
    { label: "Boş", value: stats.freeRooms, href: "/admin/pms/rooms", tone: "text-emerald-600" },
    { label: "Rezerve", value: stats.reservedRooms, href: "/admin/pms/rooms", tone: "text-sea-700" },
    { label: "Doluluk", value: `${stats.occupancyRate}%`, href: "/admin/pms/calendar", tone: "text-gold-600" },
    { label: "Bugün Giriş", value: stats.arrivalsToday, href: "#girisler", tone: "text-gold-600" },
    { label: "Bugün Çıkış", value: stats.departuresToday, href: "#cikislar", tone: "text-orange-600" },
    { label: "Konaklayan", value: stats.inHouseGuests, href: "#girisler", tone: "text-ink" },
    { label: "Temizlik", value: stats.housekeepingDirty + stats.housekeepingPending, href: "/admin/pms/rooms?hk=1", tone: "text-red-600" },
    { label: "Bugünkü Tahsilat", value: formatMoney(stats.todayCollected), href: "/admin/pms/reports", tone: "text-emerald-600" },
    { label: "Bekleyen Ödeme", value: formatMoney(stats.pendingPayment), href: "/admin/pms/reports", tone: "text-red-600" },
    { label: "Toplam Cari", value: formatMoney(stats.totalBalance), href: "/admin/pms/reports", tone: "text-ink" },
  ];

  const occupancyMax = Math.max(10, ...charts.occupancy.map((o) => o.rate));
  const revenueMax = Math.max(100, ...charts.revenue.map((r) => r.collected));

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Operasyon Paneli</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pms/reservations/new" className="btn-primary !px-4 !py-2 text-xs">+ Yeni Rezervasyon</Link>
          <Link href="/admin/pms/rooms" className="btn-ghost !px-4 !py-2 text-xs">Odalar</Link>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card card-hover p-4">
            <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">{c.label}</p>
            <p className={`mt-1.5 font-display text-2xl ${c.tone}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      {/* Bugün */}
      <div className="mt-10 grid gap-6 xl:grid-cols-2" id="bugun">
        <section className="card p-6" id="girisler">
          <h2 className="font-display text-xl">Bugünkü Girişler</h2>
          <ul className="mt-3 divide-y divide-sand-200 text-sm">
            {arrivals.map((b) => {
              const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Number(b.grandTotal) - paid;
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/admin/pms/reservations/${b.id}`} className="font-medium hover:text-gold-600">
                      {b.guest?.firstName} {b.guest?.lastName}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      Oda {b.roomAssignments.map((a) => a.room.number).join(", ") || "—"} · {b.adults} kişi
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-semibold ${balance > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {balance > 0 ? `${balance.toFixed(0)} ₾ kalan` : "Ödendi"}
                  </span>
                </li>
              );
            })}
            {arrivals.length === 0 && <li className="py-4 text-xs text-ink-muted">Bugün giriş yok.</li>}
          </ul>
        </section>

        <section className="card p-6" id="cikislar">
          <h2 className="font-display text-xl">Bugünkü Çıkışlar</h2>
          <ul className="mt-3 divide-y divide-sand-200 text-sm">
            {departures.map((b) => {
              const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Number(b.grandTotal) - paid;
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/admin/pms/reservations/${b.id}`} className="font-medium hover:text-gold-600">
                      {b.guest?.firstName} {b.guest?.lastName}
                    </Link>
                    <p className="text-xs text-ink-muted">Oda {b.roomAssignments.map((a) => a.room.number).join(", ") || "—"}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-semibold ${balance > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {balance > 0 ? `${balance.toFixed(0)} ₾ kalan` : "Tahsil edildi"}
                  </span>
                </li>
              );
            })}
            {departures.length === 0 && <li className="py-4 text-xs text-ink-muted">Bugün çıkış yok.</li>}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl">Housekeeping</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {dirtyRooms.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-sand-200 px-3 py-2">
                <span className="font-medium">{r.number}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${HOUSEKEEPING_CLASSES[r.housekeeping]}`}>
                  {HOUSEKEEPING_LABELS[r.housekeeping]}
                </span>
              </li>
            ))}
            {dirtyRooms.length === 0 && <li className="col-span-2 py-4 text-xs text-ink-muted">Tüm odalar temiz. 🎉</li>}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl">Önemli Uyarılar</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {blockedRooms.map((r) => (
              <li key={r.id} className="rounded border border-sand-200 bg-sand-50 px-3 py-2 text-xs">
                <strong>{r.number}</strong> {r.roomType.name} — {r.status === "MAINTENANCE" ? "bakımda" : "blokeli"}
                {r.blockReason ? `: ${r.blockReason}` : ""}
              </li>
            ))}
            {stats.pendingPayment > 0 && (
              <li className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {stats.pendingPayment} rezervasyonda ödeme bekliyor (toplam {formatMoney(stats.totalBalance)}).
              </li>
            )}
            {stats.awaitingCheckin > 0 && (
              <li className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {stats.awaitingCheckin} oda check-in bekliyor.
              </li>
            )}
            {blockedRooms.length === 0 && stats.pendingPayment === 0 && stats.awaitingCheckin === 0 && (
              <li className="py-4 text-xs text-ink-muted">Bekleyen uyarı yok.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Oda durumları (hızlı bakış) */}
      <section className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Oda Durumları</h2>
          <Link href="/admin/pms/rooms" className="text-xs text-gold-600 hover:underline">Tümü →</Link>
        </div>
        <RoomStatusStrip />
      </section>

      {/* Grafikler */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl">Doluluk · son 14 gün</h2>
          <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label="Günlük doluluk oranı grafiği">
            {charts.occupancy.map((o) => (
              <div key={o.date} className="flex flex-1 flex-col items-center gap-1" title={`${o.date}: %${o.rate} (${o.occupied}/${o.total})`}>
                <div
                  className="w-full rounded-t bg-gold-400/80 transition-all"
                  style={{ height: `${Math.max(2, (o.rate / occupancyMax) * 130)}px` }}
                />
                <span className="text-[9px] text-ink-muted">{o.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl">Günlük Tahsilat · son 14 gün</h2>
          <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label="Günlük tahsilat grafiği">
            {charts.revenue.map((r) => (
              <div key={r.date} className="flex flex-1 flex-col items-center gap-1" title={`${r.date}: ${formatMoney(r.collected)}`}>
                <div
                  className="w-full rounded-t bg-emerald-500/80 transition-all"
                  style={{ height: `${Math.max(2, (r.collected / revenueMax) * 130)}px` }}
                />
                <span className="text-[9px] text-ink-muted">{r.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

async function RoomStatusStrip() {
  const rooms = await db.room.findMany({
    where: { isActive: true },
    include: {
      roomType: { select: { name: true } },
      assignments: {
        where: { isActive: true, booking: { status: { in: ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] } } },
        include: { booking: { include: { guest: { select: { firstName: true, lastName: true } } } } },
        take: 1,
      },
    },
    orderBy: { number: "asc" },
    take: 60,
  });
  const { ROOM_STATUS_CLASSES } = await import("@/lib/pms/status");
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {rooms.map((r) => {
        const guest = r.assignments[0]?.booking.guest;
        return (
          <Link
            key={r.id}
            href={`/admin/pms/rooms?room=${r.id}`}
            className={`rounded-lg border p-3 transition-transform hover:-translate-y-0.5 ${ROOM_STATUS_CLASSES[r.status]}`}
          >
            <p className="font-display text-lg font-bold">{r.number}</p>
            <p className="text-[10px] opacity-75">{ROOM_STATUS_LABELS[r.status]}</p>
            <p className="mt-1 truncate text-[11px]">{guest ? `${guest.firstName} ${guest.lastName}` : r.roomType.name}</p>
          </Link>
        );
      })}
      {rooms.length === 0 && (
        <p className="col-span-full py-4 text-xs text-ink-muted">
          Henüz fiziksel oda tanımlanmamış. <Link href="/admin/pms/rooms" className="text-gold-600">Oda ekle →</Link>
        </p>
      )}
    </div>
  );
}
