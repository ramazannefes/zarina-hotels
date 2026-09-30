import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ROOM_STATUS_LABELS } from "@/lib/pms/status";
import PmsCalendarLegend from "@/components/admin/pms/PmsCalendarLegend";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PmsCalendarPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const startDate = typeof sp.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : new Date().toISOString().slice(0, 10);
  const days = 14;

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + days * 86_400_000);

  const [rooms, assignments, maintenanceRooms] = await Promise.all([
    db.room.findMany({
      where: { isActive: true },
      include: { roomType: { select: { name: true } } },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    }),
    db.roomAssignment.findMany({
      where: {
        isActive: true,
        booking: { status: { in: ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] }, checkOut: { gt: start }, checkIn: { lt: end } },
      },
      include: {
        booking: {
          include: { guest: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.room.findMany({ where: { status: { in: ["MAINTENANCE", "BLOCKED"] }, isActive: true }, select: { id: true, status: true } }),
  ]);

  // date index → assignments per room per day
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }

  const roomDay = new Map<string, Map<string, { bookingId: string; reference: string; guest: string; status: string; kind: "in" | "stay" | "out" }>>();
  for (const a of assignments) {
    const ci = a.booking.checkIn.toISOString().slice(0, 10);
    const co = a.booking.checkOut.toISOString().slice(0, 10);
    for (const d of dates) {
      if (ci <= d && d < co) {
        if (!roomDay.has(a.roomId)) roomDay.set(a.roomId, new Map());
        const kind = d === ci ? "in" : d === co ? "out" : "stay";
        roomDay.get(a.roomId)!.set(d, {
          bookingId: a.bookingId,
          reference: a.booking.reference,
          guest: `${a.booking.guest?.firstName ?? ""} ${a.booking.guest?.lastName ?? ""}`.trim(),
          status: a.booking.status,
          kind,
        });
      }
    }
  }
  const maintenanceMap = new Map(maintenanceRooms.map((r) => [r.id, r.status as string]));

  const canSeeMoney = hasPermission(admin.role, "bookings.view");

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Doluluk Takvimi</h1>
        </div>
        <form action="/admin/pms/calendar" className="flex items-end gap-2">
          <div>
            <label htmlFor="start" className="label">Başlangıç</label>
            <input id="start" name="start" type="date" defaultValue={startDate} className="input !py-2" />
          </div>
          <button type="submit" className="btn-ghost !px-4 !py-2 text-xs">Git</button>
        </form>
      </div>

      <PmsCalendarLegend />

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-sand-200 bg-white px-3 py-2 text-left">Oda</th>
              {dates.map((d) => {
                const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} className={`border-b border-sand-200 px-1 py-2 text-center font-medium ${isWeekend ? "bg-sand-50 text-ink" : "text-ink-muted"}`}>
                    {d.slice(8)}.{d.slice(5, 7)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-b border-sand-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <p className="font-bold">{room.number}</p>
                  <p className="text-[10px] text-ink-muted">{room.roomType.name}</p>
                </td>
                {dates.map((d) => {
                  const cell = roomDay.get(room.id)?.get(d);
                  const maint = maintenanceMap.get(room.id);
                  const ci = cell ? cell.kind === "in" : false;
                  const co = cell ? cell.kind === "out" : false;
                  const base = cell
                    ? cell.status === "CHECKED_IN"
                      ? "bg-emerald-100 text-emerald-900"
                      : cell.status === "CONFIRMED"
                        ? "bg-sea-100 text-sea-700"
                        : "bg-amber-50 text-amber-800"
                    : maint
                      ? "bg-sand-200 text-ink-muted"
                      : "bg-white text-ink-muted";
                  return (
                    <td key={d} className={`border border-sand-100 px-1 py-1 text-center ${base}`}>
                      {cell ? (
                        <Link
                          href={`/admin/pms/reservations/${cell.bookingId}`}
                          title={`${cell.reference} · ${cell.guest}${canSeeMoney ? "" : ""}`}
                          className="block truncate hover:underline"
                        >
                          {ci ? "▸ " : ""}{cell.guest.split(" ")[0]}{co ? " ◂" : ""}
                        </Link>
                      ) : maint ? (
                        <span title={maint === "MAINTENANCE" ? "Bakımda" : "Blokeli"}>{maint === "MAINTENANCE" ? "🔧" : "⛔"}</span>
                      ) : (
                        <span className="text-sand-300">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr><td colSpan={days + 1} className="px-4 py-10 text-center text-xs text-ink-muted">Fiziksel oda tanımlı değil.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Hücreler: yeşil = konaklıyor, mavi = onaylı rezervasyon, sarı = bekliyor, 🔧 bakım, ⛔ blokeli.
        Rezervasyon adına tıklayınca detay açılır. Giriş günü ▸, çıkış günü ◂ ile işaretlidir.
        {canSeeMoney ? "" : ""}
      </p>
    </div>
  );
}
