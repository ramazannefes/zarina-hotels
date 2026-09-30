import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import ReservationDetailView from "@/components/admin/pms/ReservationDetailView";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  BANK_TRANSFER: "Banka Transferi",
  WIRE: "Havale/EFT",
  OTHER: "Diğer",
  MOCK: "Online (Mock)",
};

type Props = { params: Promise<{ bookingId: string }> };

export default async function PmsReservationDetailPage({ params }: Props) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.view")) redirect("/admin/no-access");

  const { bookingId } = await params;
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: { include: { pmsProfile: true } },
      hotel: { select: { id: true, name: true } },
      rooms: { include: { roomType: { select: { name: true } } } },
      extras: { include: { extra: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      roomAssignments: { include: { room: { include: { roomType: { select: { name: true } } } } } },
    },
  });
  if (!booking) notFound();

  const freeRooms = await db.room.findMany({
    where: {
      hotelId: booking.hotel.id,
      isActive: true,
      status: { in: ["FREE", "RESERVED", "AWAITING_CHECKIN"] },
    },
    include: { roomType: { select: { name: true } } },
    orderBy: { number: "asc" },
  });

  const total = num(booking.grandTotal);
  const paid = booking.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + num(p.amount), 0);
  const balance = Math.round((total - paid) * 100) / 100;

  const canCheckin = hasPermission(admin.role, "pms.checkin");
  const canPayments = hasPermission(admin.role, "pms.payments");
  const canCancel = hasPermission(admin.role, "pms.reservations");

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Otel Yönetim / PMS</p>
          <h1 className="mt-1 font-display text-3xl">{booking.reference}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {booking.hotel.name} · {booking.rooms.map((r) => `${r.roomType.name} ×${r.quantity}`).join(", ") || "—"} · Kaynak: {booking.source}
          </p>
        </div>
        <Link href="/admin/pms/reservations" className="btn-ghost !px-4 !py-2 text-xs">← Listeye Dön</Link>
      </div>

      <ReservationDetailView
        booking={{
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          checkIn: booking.checkIn.toISOString().slice(0, 10),
          checkOut: booking.checkOut.toISOString().slice(0, 10),
          nights: booking.nights,
          adults: booking.adults,
          children: booking.children,
          internalNotes: booking.internalNotes,
          specialRequests: booking.specialRequests,
          total,
          paid: Math.round(paid * 100) / 100,
          balance,
          source: booking.source,
        }}
        guest={booking.guest ? {
          firstName: booking.guest.firstName,
          lastName: booking.guest.lastName,
          email: booking.guest.email,
          phone: booking.guest.phone,
          country: booking.guest.country,
        } : null}
        pmsProfile={booking.guest?.pmsProfile ? {
          identityNo: booking.guest.pmsProfile.identityNo,
          nationality: booking.guest.pmsProfile.nationality,
          address: booking.guest.pmsProfile.address,
          notes: booking.guest.pmsProfile.notes,
        } : null}
        assignments={booking.roomAssignments.map((a) => ({
          id: a.id,
          isActive: a.isActive,
          roomNumber: a.room.number,
          roomTypeName: a.room.roomType.name,
        }))}
        payments={booking.payments.map((p) => ({
          id: p.id,
          amount: num(p.amount),
          method: METHOD_LABELS[p.provider === "MANUAL" ? (p.method ?? "OTHER") : p.provider] ?? p.provider,
          status: p.status,
          isManual: p.provider === "MANUAL",
          createdAt: p.createdAt.toISOString(),
        }))}
        freeRooms={freeRooms.map((r) => ({ id: r.id, number: r.number, roomTypeName: r.roomType.name }))}
        perms={{ canCheckin, canPayments, canCancel }}
      />
    </div>
  );
}
