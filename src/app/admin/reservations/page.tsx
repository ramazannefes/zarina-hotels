import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/money";
import { TR_BOOKING_STATUS, TR_PAYMENT_STATUS, TR_COMMON } from "@/lib/admin-i18n";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReservationsPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "bookings.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSize = 20;

  const where = {
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { guest: { email: { contains: q.toLowerCase() } } },
            { guest: { firstName: { contains: q } } },
            { guest: { lastName: { contains: q } } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        guest: { select: { firstName: true, lastName: true, email: true } },
        hotel: { select: { name: true } },
        rooms: { include: { roomType: { select: { name: true } } } },
        payments: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.booking.count({ where }),
  ]);

  const statuses = Object.keys(TR_BOOKING_STATUS);

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Rezervasyonlar</p>
          <h1 className="mt-1 font-display text-3xl">{total} rezervasyon</h1>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/reservations">
        <div>
          <label htmlFor="q" className="label">{TR_COMMON.search}</label>
          <input id="q" name="q" defaultValue={q} placeholder="Referans, isim, e-posta" className="input !w-64 !py-2" />
        </div>
        <div>
          <label htmlFor="status" className="label">Durum</label>
          <select id="status" name="status" defaultValue={status} className="input !w-44 !py-2">
            <option value="">{TR_COMMON.all}</option>
            {statuses.map((s) => <option key={s} value={s}>{TR_BOOKING_STATUS[s] ?? s}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">{TR_COMMON.filter}</button>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Referans</th>
              <th className="px-4 py-3">Misafir</th>
              <th className="px-4 py-3">Otel / Oda</th>
              <th className="px-4 py-3">Tarihler</th>
              <th className="px-4 py-3">Toplam</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Ödeme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-medium">{b.reference}</td>
                <td className="px-4 py-3">
                  {b.guest?.firstName} {b.guest?.lastName}
                  <span className="block text-xs text-ink-muted">{b.guest?.email}</span>
                </td>
                <td className="px-4 py-3">
                  {b.hotel.name}
                  <span className="block text-xs text-ink-muted">{b.rooms.map((r) => `${r.roomType.name} ×${r.quantity}`).join(", ")}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3">{formatMoney(Number(b.grandTotal))}</td>
                <td className="px-4 py-3">
                  <span className="bg-sand-100 px-2 py-1 text-[10px] font-medium uppercase tracking-widest2">{TR_BOOKING_STATUS[b.status] ?? b.status}</span>
                </td>
                <td className="px-4 py-3 text-xs">{b.payments[0] ? (TR_PAYMENT_STATUS[b.payments[0].status] ?? b.payments[0].status) : "—"}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-ink-muted">Filtreye uyan rezervasyon yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-6 flex gap-2 text-xs" aria-label="Sayfalama">
        {page > 1 && <Link href={`/admin/reservations?page=${page - 1}&q=${encodeURIComponent(q)}&status=${status}`} className="btn-ghost !px-3 !py-1.5">{TR_COMMON.prev}</Link>}
        {(page - 1) * pageSize + bookings.length < total && (
          <Link href={`/admin/reservations?page=${page + 1}&q=${encodeURIComponent(q)}&status=${status}`} className="btn-ghost !px-3 !py-1.5">{TR_COMMON.next}</Link>
        )}
      </nav>
    </div>
  );
}
