import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminHotelsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "hotels.view")) redirect("/admin/no-access");

  const hotels = await db.hotel.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { rooms: true, bookings: true } }, translations: { where: { locale: "en" } } },
  });

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Properties</p>
          <h1 className="mt-1 font-display text-3xl">Hotels</h1>
        </div>
        {hasPermission(admin.role, "hotels.edit") && (
          <Link href="/admin/hotels/new" className="btn-primary !px-4 !py-2 text-xs">+ New hotel</Link>
        )}
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Rooms</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {hotels.map((h) => (
              <tr key={h.id} className="hover:bg-sand-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-ink-muted">/{h.slug}</p>
                </td>
                <td className="px-4 py-3">{h.city}</td>
                <td className="px-4 py-3">{h._count.rooms}</td>
                <td className="px-4 py-3">{h._count.bookings}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-[10px] font-medium uppercase tracking-widest2 ${h.isActive ? "bg-green-50 text-green-800" : "bg-sand-100 text-ink-muted"}`}>
                    {h.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {h.isDemo && <span className="badge-demo">DEMO</span>}
                  {h.translations[0]?.needsVerification && <span className="badge-verify ml-1">VERIFY</span>}
                </td>
              </tr>
            ))}
            {hotels.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-ink-muted">No hotels yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
