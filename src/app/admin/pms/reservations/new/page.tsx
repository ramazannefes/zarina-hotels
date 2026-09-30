import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { num } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";
import NewReservationForm from "@/components/admin/pms/NewReservationForm";

export const dynamic = "force-dynamic";

export default async function NewPmsReservationPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "pms.reservations")) redirect("/admin/no-access");

  const hotels = await db.hotel.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const rooms = await db.room.findMany({
    where: { isActive: true },
    include: { hotel: { select: { id: true, name: true } }, roomType: { select: { name: true, maxGuests: true, basePrice: true } } },
    orderBy: [{ hotelId: "asc" }, { number: "asc" }],
  });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Otel Yönetim / PMS</p>
      <h1 className="mt-1 font-display text-3xl">Yeni Rezervasyon</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Resepsiyon / telefon / walk-in rezervasyonları için manuel kayıt. Tarih çakışmaları, kapasite
        ve oda kullanılabilirliği sunucu tarafında doğrulanır.
      </p>

      <NewReservationForm
        hotels={hotels}
        rooms={rooms.map((r) => ({
          id: r.id,
          number: r.number,
          hotelId: r.hotel.id,
          hotelName: r.hotel.name,
          roomTypeName: r.roomType.name,
          maxGuests: r.roomType.maxGuests,
          basePrice: num(r.roomType.basePrice),
          status: r.status,
        }))}
      />
    </div>
  );
}
