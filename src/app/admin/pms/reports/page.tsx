import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import CsvExportButton from "@/components/admin/pms/CsvExportButton";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PmsReportsPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view") || !hasPermission(admin.role, "pms.reports")) {
    // FINANCE + managers get reports; housekeeping/reception see no-access
    if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");
  }
  if (!hasPermission(admin.role, "pms.reports")) redirect("/admin/no-access");

  const sp = await searchParams;
  const from = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const to = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : new Date().toISOString().slice(0, 10);

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const totalRooms = await db.room.count({ where: { isActive: true } });

  const [bookings, payments, cancelled] = await Promise.all([
    db.booking.findMany({
      where: { checkIn: { gte: start, lte: end }, status: { in: ["PMS_HOLD", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } },
      select: { checkIn: true, checkOut: true, grandTotal: true, status: true, createdAt: true },
    }),
    db.payment.findMany({
      where: { status: "PAID", capturedAt: { gte: start, lte: end } },
      select: { amount: true, method: true, provider: true, capturedAt: true },
    }),
    db.booking.findMany({
      where: { status: "CANCELLED", cancelledAt: { gte: start, lte: end } },
      select: { grandTotal: true },
    }),
  ]);

  // Günlük doluluk (oda-gün bazında)
  const dayList: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    dayList.push(new Date(t).toISOString().slice(0, 10));
  }
  const dailyOccupancy = dayList.map((d) => {
    const occupied = bookings.filter((b) => b.checkIn.toISOString().slice(0, 10) <= d && d < b.checkOut.toISOString().slice(0, 10)).length;
    return { date: d, occupied, rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0 };
  });
  const avgOccupancy = dailyOccupancy.length > 0 ? Math.round(dailyOccupancy.reduce((s, d) => s + d.rate, 0) / dailyOccupancy.length) : 0;

  // Gelir / tahsilat
  const revenue = bookings.reduce((s, b) => s + num(b.grandTotal), 0);
  const collected = payments.reduce((s, p) => s + num(p.amount), 0);
  const cancelledTotal = cancelled.reduce((s, b) => s + num(b.grandTotal), 0);
  const paymentMix = Object.entries(
    payments.reduce<Record<string, number>>((acc, p) => {
      const key = p.method ?? p.provider;
      acc[key] = (acc[key] ?? 0) + num(p.amount);
      return acc;
    }, {}),
  ).map(([method, total]) => ({ method, total }));

  // Oda performansı (en çok konaklama yapılan odalar)
  const roomPerf = await db.roomAssignment.groupBy({
    by: ["roomId"],
    where: { booking: { checkIn: { gte: start, lte: end }, status: { in: ["CHECKED_IN", "CHECKED_OUT", "CONFIRMED"] } } },
    _count: { _all: true },
  });
  const roomIds = roomPerf.map((r) => r.roomId);
  const roomRecords = roomIds.length > 0
    ? await db.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, number: true, roomType: { select: { name: true } } } })
    : [];
  const roomPerfRows = roomPerf
    .map((rp) => {
      const rec = roomRecords.find((r) => r.id === rp.roomId);
      return { number: rec?.number ?? "?", type: rec?.roomType.name ?? "?", count: rp._count._all };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const METHOD_TR: Record<string, string> = {
    CASH: "Nakit", CREDIT_CARD: "Kredi Kartı", BANK_TRANSFER: "Banka Transferi", WIRE: "Havale/EFT", OTHER: "Diğer", MOCK: "Online",
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Raporlar</h1>
        </div>
        <CsvExportButton
          filename={`pms-rapor-${from}_${to}.csv`}
          rows={{
            "Günlük Doluluk": dailyOccupancy.map((d) => ({ Tarih: d.date, "Dolu Oda": d.occupied, "Doluluk %": d.rate })),
            "Ödeme Yöntemleri": paymentMix.map((m) => ({ Yöntem: METHOD_TR[m.method] ?? m.method, Tutar: m.total })),
            "Oda Performansı": roomPerfRows.map((r) => ({ Oda: r.number, Tip: r.type, "Rezervasyon Sayısı": r.count })),
          }}
        />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/pms/reports">
        <div>
          <label htmlFor="from" className="label">Başlangıç</label>
          <input id="from" name="from" type="date" defaultValue={from} className="input !py-2" />
        </div>
        <div>
          <label htmlFor="to" className="label">Bitiş</label>
          <input id="to" name="to" type="date" defaultValue={to} className="input !py-2" />
        </div>
        <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">Uygula</button>
      </form>

      {/* Özet */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">Ortalama Doluluk</p>
          <p className="mt-1 font-display text-2xl text-gold-600">%{avgOccupancy}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">Dönem Geliri</p>
          <p className="mt-1 font-display text-2xl">{formatMoney(Math.round(revenue * 100) / 100)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">Tahsilat</p>
          <p className="mt-1 font-display text-2xl text-emerald-600">{formatMoney(Math.round(collected * 100) / 100)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">Rezervasyon</p>
          <p className="mt-1 font-display text-2xl">{bookings.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] uppercase tracking-widest2 text-ink-muted">İptal</p>
          <p className="mt-1 font-display text-2xl text-red-600">{cancelled.length} ({formatMoney(Math.round(cancelledTotal * 100) / 100)})</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Günlük doluluk tablosu (ilk 30 gün) */}
        <section className="card p-6">
          <h2 className="font-display text-xl">Günlük Doluluk</h2>
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sand-200">
                {dailyOccupancy.slice(0, 31).map((d) => (
                  <tr key={d.date}>
                    <td className="py-1.5 text-xs">{fmt(d.date)}</td>
                    <td className="py-1.5 text-right">{d.occupied}/{totalRooms} oda</td>
                    <td className="py-1.5 text-right font-medium">%{d.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ödeme yöntemleri + oda performansı */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-xl">Tahsilat Yöntemlerine Göre</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {paymentMix.map((m) => (
                <li key={m.method} className="flex justify-between border-b border-sand-100 pb-2">
                  <span>{METHOD_TR[m.method] ?? m.method}</span>
                  <strong>{formatMoney(m.total)}</strong>
                </li>
              ))}
              {paymentMix.length === 0 && <li className="py-4 text-xs text-ink-muted">Bu dönemde tahsilat yok.</li>}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-xl">Oda Performansı</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {roomPerfRows.map((r) => (
                <li key={r.number} className="flex justify-between border-b border-sand-100 pb-2">
                  <span><strong>{r.number}</strong> · {r.type}</span>
                  <span>{r.count} rezervasyon</span>
                </li>
              ))}
              {roomPerfRows.length === 0 && <li className="py-4 text-xs text-ink-muted">Veri yok.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function fmt(d: string): string {
  return d.split("-").reverse().join(".");
}
