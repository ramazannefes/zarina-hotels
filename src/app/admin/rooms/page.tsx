import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "hotels.view")) redirect("/admin/no-access");

  const rooms = await db.roomType.findMany({
    orderBy: [{ hotelId: "asc" }, { sortOrder: "asc" }],
    include: { hotel: { select: { name: true } }, _count: { select: { bookingRooms: true } } },
  });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Envanter</p>
      <h1 className="mt-1 font-display text-3xl">Oda Tipleri</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Oda</th>
              <th className="px-4 py-3">Otel</th>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Maks. Kişi</th>
              <th className="px-4 py-3">Temel Fiyat</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rooms.map((r) => (
              <tr key={r.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">{r.hotel.name}</td>
                <td className="px-4 py-3 text-xs">{r.code}</td>
                <td className="px-4 py-3">{r.maxGuests}</td>
                <td className="px-4 py-3">{formatMoney(Number(r.basePrice))}</td>
                <td className="px-4 py-3">{r.inventoryCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-[10px] font-medium uppercase tracking-widest2 ${r.isActive ? "bg-green-50 text-green-800" : "bg-sand-100 text-ink-muted"}`}>
                    {r.isActive ? "Aktif" : "Pasif"}
                  </span>
                  {r.isDemo && <span className="badge-demo ml-1">DEMO</span>}
                </td>
              </tr>
            ))}
            {rooms.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-ink-muted">Henüz oda tipi yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
