import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import {
  ROOM_STATUS_LABELS,
  ROOM_STATUS_CLASSES,
  HOUSEKEEPING_LABELS,
  HOUSEKEEPING_CLASSES,
  utcToday,
} from "@/lib/pms/status";
import { formatMoney } from "@/lib/money";
import RoomsView from "@/components/admin/pms/RoomsView";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PmsRoomsPage({ searchParams }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const floor = typeof sp.floor === "string" ? parseInt(sp.floor, 10) : undefined;
  const status = typeof sp.status === "string" ? sp.status : "";
  const hk = typeof sp.hk === "string" ? sp.hk : "";
  const selectedRoomId = typeof sp.room === "string" ? sp.room : "";

  const today = utcToday();
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(`${today}T23:59:59.999Z`);

  // Otel + oda tipleri (form için)
  const [hotels, roomTypes] = await Promise.all([
    db.hotel.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.roomType.findMany({ where: { isActive: true }, select: { id: true, name: true, hotelId: true, maxGuests: true, basePrice: true } }),
  ]);

  const rooms = await db.room.findMany({
    where: {
      ...(q ? { number: { contains: q } } : {}),
      ...(floor !== undefined && !Number.isNaN(floor) ? { floor } : {}),
      ...(status ? { status: status as never } : {}),
      ...(hk ? { housekeeping: hk as never } : {}),
    },
    include: {
      hotel: { select: { id: true, name: true } },
      roomType: { select: { id: true, name: true, maxGuests: true, basePrice: true } },
      assignments: {
        where: { isActive: true, booking: { status: { in: ["PMS_HOLD", "CONFIRMED", "CHECKED_IN"] } } },
        include: {
          booking: {
            include: {
              guest: { select: { firstName: true, lastName: true } },
              payments: { where: { status: "PAID" }, select: { amount: true } },
            },
          },
        },
        take: 1,
      },
      housekeepingTasks: { where: { status: { in: ["PENDING", "IN_PROGRESS"] } }, take: 1 },
    },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });

  // Aktif konaklama finansları — server-side hesap
  const rows = rooms.map((r) => {
    const a = r.assignments[0];
    const booking = a?.booking;
    const paid = booking ? booking.payments.reduce((s, p) => s + num(p.amount), 0) : 0;
    const total = booking ? num(booking.grandTotal) : 0;
    return {
      id: r.id,
      number: r.number,
      floor: r.floor,
      status: r.status,
      housekeeping: r.housekeeping,
      blockReason: r.blockReason,
      notes: r.notes,
      hotelId: r.hotel.id,
      hotelName: r.hotel.name,
      roomTypeName: r.roomType.name,
      maxGuests: r.roomType.maxGuests,
      basePrice: num(r.roomType.basePrice),
      isActive: r.isActive,
      guest: booking?.guest ? { firstName: booking.guest.firstName, lastName: booking.guest.lastName } : null,
      bookingId: booking?.id ?? null,
      reference: booking?.reference ?? null,
      checkIn: booking ? booking.checkIn.toISOString().slice(0, 10) : null,
      checkOut: booking ? booking.checkOut.toISOString().slice(0, 10) : null,
      paid,
      total,
      balance: Math.round((total - paid) * 100) / 100,
      hasPendingTask: r.housekeepingTasks.length > 0,
    };
  });

  const canManage = hasPermission(admin.role, "pms.rooms.manage");
  const canHousekeeping = hasPermission(admin.role, "pms.housekeeping");
  const canCheckin = hasPermission(admin.role, "pms.checkin");
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">Odalar ({rows.length})</h1>
        </div>
      </div>

      <RoomsView
        rows={rows}
        hotels={hotels}
        roomTypes={roomTypes.map((rt) => ({ id: rt.id, name: rt.name, hotelId: rt.hotelId, maxGuests: rt.maxGuests, basePrice: num(rt.basePrice) }))}
        floors={floors}
        canManage={canManage}
        canHousekeeping={canHousekeeping}
        canCheckin={canCheckin}
        selectedRoomId={selectedRoomId}
      />
    </div>
  );
}
