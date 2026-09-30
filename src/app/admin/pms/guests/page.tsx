import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PmsGuestsPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const profiles = await db.guestProfile.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q.toLowerCase() } },
            { phone: { contains: q } },
          ],
        }
      : {},
    include: {
      guestRecords: {
        include: {
          booking: {
            include: { payments: { where: { status: "PAID" }, select: { amount: true } } },
          },
        },
      },
    },
    orderBy: { lastName: "asc" },
    take: 200,
  });

  const rows = profiles.map((p) => {
    const validBookings = p.guestRecords.filter((g) => g.booking && g.booking.status !== "CANCELLED");
    const stays = validBookings.length;
    const lastStay = validBookings
      .map((g) => g.booking!.checkIn)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const totalSpend = validBookings.reduce((s, g) => s + num(g.booking!.grandTotal), 0);
    const totalPaid = validBookings.reduce(
      (s, g) => s + g.booking!.payments.reduce((ps, pay) => ps + num(pay.amount), 0),
      0,
    );
    const balance = Math.round((totalSpend - totalPaid) * 100) / 100;
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      nationality: p.nationality,
      identityNo: p.identityNo,
      stays,
      lastStay: lastStay ? lastStay.toISOString().slice(0, 10) : null,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balance,
    };
  });

  const canManage = hasPermission(admin.role, "pms.guests");

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Misafirler ({rows.length})</h1>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/pms/guests">
        <div>
          <label htmlFor="q" className="label">Ara</label>
          <input id="q" name="q" defaultValue={q} placeholder="İsim, e-posta veya telefon" className="input !w-72 !py-2" />
        </div>
        <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">Ara</button>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Misafir</th>
              <th className="px-4 py-3">İletişim</th>
              <th className="px-4 py-3">Uyruk</th>
              <th className="px-4 py-3 text-center">Konaklama</th>
              <th className="px-4 py-3">Son Konaklama</th>
              <th className="px-4 py-3 text-right">Toplam Harcama</th>
              <th className="px-4 py-3 text-right">Toplam Ödeme</th>
              <th className="px-4 py-3 text-right">Cari</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-medium">
                  {g.firstName} {g.lastName}
                </td>
                <td className="px-4 py-3 text-xs">
                  {g.email}
                  {g.phone && <span className="block text-ink-muted">{g.phone}</span>}
                </td>
                <td className="px-4 py-3 text-xs">{g.nationality ?? "—"}</td>
                <td className="px-4 py-3 text-center font-semibold">{g.stays}</td>
                <td className="px-4 py-3 text-xs">{g.lastStay ? fmt(g.lastStay) : "—"}</td>
                <td className="px-4 py-3 text-right">{formatMoney(g.totalSpend)}</td>
                <td className="px-4 py-3 text-right">{formatMoney(g.totalPaid)}</td>
                <td className={`px-4 py-3 text-right ${g.balance > 0 ? "font-semibold text-red-600" : "text-emerald-600"}`}>
                  {formatMoney(g.balance)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">Misafir profili yok. PMS rezervasyonları oluşturuldukça burada listelenir.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <p className="mt-4 text-xs text-ink-muted">
          Yeni misafir profilleri rezervasyon oluşturulurken otomatik kaydedilir; rezervasyon formundaki
          bilgiler mevcut profillerle e-posta üzerinden eşleştirilir.
        </p>
      )}
    </div>
  );
}

function fmt(d: string): string {
  return d.split("-").reverse().join(".");
}
