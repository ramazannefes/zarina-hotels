import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PMS_HOLD: "Bekliyor",
  CONFIRMED: "Onaylandı",
  CHECKED_IN: "Konaklıyor",
  CHECKED_OUT: "Çıkış Yapıldı",
  CANCELLED: "İptal",
  NO_SHOW: "No-show",
};

const STATUS_CLASSES: Record<string, string> = {
  PMS_HOLD: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-sea-100 text-sea-700",
  CHECKED_IN: "bg-emerald-50 text-emerald-700",
  CHECKED_OUT: "bg-sand-100 text-ink-muted",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-sand-100 text-ink-muted",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PmsReservationsPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const dateFrom = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : "";
  const dateTo = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "createdAt";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSize = 20;

  // Whitelisted sort keys — no arbitrary field injection
  const orderBy =
    sort === "checkIn"
      ? ({ checkIn: "desc" } as const)
      : sort === "checkOut"
        ? ({ checkOut: "desc" } as const)
        : ({ createdAt: "desc" } as const);

  const where = {
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { guest: { firstName: { contains: q } } },
            { guest: { lastName: { contains: q } } },
            { guest: { email: { contains: q.toLowerCase() } } },
            { guest: { phone: { contains: q } } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
    ...(dateFrom ? { checkOut: { gte: new Date(`${dateFrom}T00:00:00.000Z`) } } : {}),
    ...(dateTo ? { checkIn: { lte: new Date(`${dateTo}T23:59:59.999Z`) } } : {}),
  };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        roomAssignments: { where: { isActive: true }, include: { room: { select: { number: true } } } },
        payments: { where: { status: "PAID" }, select: { amount: true } },
      },
    }),
    db.booking.count({ where }),
  ]);

  const canCreate = hasPermission(admin.role, "pms.reservations");

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Rezervasyonlar ({total})</h1>
        </div>
        {canCreate && <Link href="/admin/pms/reservations/new" className="btn-primary !px-4 !py-2 text-xs">+ Yeni Rezervasyon</Link>}
      </div>

      {/* Filtreler — backend'de çalışır (GET form) */}
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/pms/reservations">
        <div>
          <label htmlFor="q" className="label">Ara</label>
          <input id="q" name="q" defaultValue={q} placeholder="Referans, isim, e-posta, telefon" className="input !w-64 !py-2" />
        </div>
        <div>
          <label htmlFor="status" className="label">Durum</label>
          <select id="status" name="status" defaultValue={status} className="input !w-44 !py-2">
            <option value="">Tümü</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="label">Giriş ≥</label>
          <input id="from" name="from" type="date" defaultValue={dateFrom} className="input !py-2" />
        </div>
        <div>
          <label htmlFor="to" className="label">Çıkış ≤</label>
          <input id="to" name="to" type="date" defaultValue={dateTo} className="input !py-2" />
        </div>
        <div>
          <label htmlFor="sort" className="label">Sırala</label>
          <select id="sort" name="sort" defaultValue={sort} className="input !w-44 !py-2">
            <option value="createdAt">Oluşturulma ↓</option>
            <option value="checkIn">Giriş tarihi ↓</option>
            <option value="checkOut">Çıkış tarihi ↓</option>
          </select>
        </div>
        <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">Filtrele</button>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Referans</th>
              <th className="px-4 py-3">Misafir</th>
              <th className="px-4 py-3">Oda</th>
              <th className="px-4 py-3">Tarihler</th>
              <th className="px-4 py-3 text-right">Toplam</th>
              <th className="px-4 py-3 text-right">Tahsilat</th>
              <th className="px-4 py-3 text-right">Kalan</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {bookings.map((b) => {
              const paid = b.payments.reduce((s, p) => s + num(p.amount), 0);
              const balance = num(b.grandTotal) - paid;
              return (
                <tr key={b.id} className="hover:bg-sand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pms/reservations/${b.id}`} className="font-medium text-gold-600 hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {b.guest?.firstName} {b.guest?.lastName}
                    <span className="block text-xs text-ink-muted">{b.guest?.phone}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {b.roomAssignments.map((a) => a.room.number).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {fmt(b.checkIn)} → {fmt(b.checkOut)} <span className="text-ink-muted">({b.nights} gece)</span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(num(b.grandTotal))}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(paid)}</td>
                  <td className={`px-4 py-3 text-right ${balance > 0.005 ? "font-semibold text-red-600" : "text-emerald-600"}`}>
                    {formatMoney(Math.max(0, balance))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] font-semibold ${STATUS_CLASSES[b.status] ?? "bg-sand-100"}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">Filtreye uyan rezervasyon yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-6 flex gap-2 text-xs" aria-label="Sayfalama">
        {page > 1 && (
          <Link href={`/admin/pms/reservations?page=${page - 1}&q=${encodeURIComponent(q)}&status=${status}&from=${dateFrom}&to=${dateTo}&sort=${sort}`} className="btn-ghost !px-3 !py-1.5">
            ← Önceki
          </Link>
        )}
        {(page - 1) * pageSize + bookings.length < total && (
          <Link href={`/admin/pms/reservations?page=${page + 1}&q=${encodeURIComponent(q)}&status=${status}&from=${dateFrom}&to=${dateTo}&sort=${sort}`} className="btn-ghost !px-3 !py-1.5">
            Sonraki →
          </Link>
        )}
      </nav>
    </div>
  );
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10).split("-").reverse().join(".");
}
