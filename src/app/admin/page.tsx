import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "dashboard.view")) redirect("/admin/no-access");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [arrivals, departures, activeReservations, pendingPayments, revenue30d, recentBookings] = await Promise.all([
    db.booking.count({ where: { status: "CONFIRMED", checkIn: new Date(todayStr) } }),
    db.booking.count({ where: { status: "CONFIRMED", checkOut: new Date(todayStr) } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "CHECKED_IN", "HOLDING", "PENDING_PAYMENT"] } } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.booking.aggregate({
      where: { status: "CONFIRMED", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      _sum: { grandTotal: true },
    }),
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { guest: { select: { firstName: true, lastName: true } }, hotel: { select: { name: true } } },
    }),
  ]);

  const stats = [
    { label: "Arrivals today", value: arrivals, href: "/admin/reservations" },
    { label: "Departures today", value: departures, href: "/admin/reservations" },
    { label: "Active reservations", value: activeReservations, href: "/admin/reservations" },
    { label: "Pending payments", value: pendingPayments, href: "/admin/reservations" },
  ];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl">Good day, {admin.name.split(" ")[0]}</h1>
        </div>
        <p className="text-xs text-ink-muted">{today.toISOString().slice(0, 10)} · Asia/Tbilisi operations</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-6 transition-shadow hover:shadow-lift">
            <p className="text-xs uppercase tracking-widest2 text-ink-muted">{s.label}</p>
            <p className="mt-2 font-display text-4xl text-gold-600">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-xl">Revenue · last 30 days</h2>
          <p className="mt-3 font-display text-4xl text-gold-600">
            ₾ {Number(revenue30d._sum.grandTotal ?? 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Confirmed bookings, canonical GEL</p>
          <Link href="/admin/analytics" className="btn-ghost mt-4 !px-4 !py-2 text-xs">Open analytics</Link>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-xl">Latest bookings</h2>
          <ul className="mt-4 divide-y divide-sand-200 text-sm">
            {recentBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{b.reference}</p>
                  <p className="text-xs text-ink-muted">{b.guest?.firstName} {b.guest?.lastName} · {b.hotel.name}</p>
                </div>
                <span className="bg-sand-100 px-2 py-1 text-[10px] font-medium uppercase tracking-widest2">{b.status}</span>
              </li>
            ))}
            {recentBookings.length === 0 && <li className="py-4 text-xs text-ink-muted">No bookings yet.</li>}
          </ul>
          <Link href="/admin/reservations" className="btn-ghost mt-4 !px-4 !py-2 text-xs">All reservations</Link>
        </div>
      </div>
    </div>
  );
}
