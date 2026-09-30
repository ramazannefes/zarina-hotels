"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createReservationAction } from "@/app/admin/pms/actions";
import { formatMoney } from "@/lib/money";
import { ROOM_STATUS_LABELS } from "@/lib/pms/status";
import type { PhysicalRoomStatus } from "@prisma/client";

type RoomOption = {
  id: string;
  number: string;
  hotelId: string;
  hotelName: string;
  roomTypeName: string;
  maxGuests: number;
  basePrice: number;
  status: PhysicalRoomStatus;
};

type Props = {
  hotels: { id: string; name: string }[];
  rooms: RoomOption[];
};

export default function NewReservationForm({ hotels, rooms }: Props) {
  const router = useRouter();
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [nightlyRate, setNightlyRate] = useState<number | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identityNo, setIdentityNo] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const hotelRooms = useMemo(() => rooms.filter((r) => r.hotelId === hotelId), [rooms, hotelId]);
  const room = hotelRooms.find((r) => r.id === roomId);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const ci = new Date(`${checkIn}T00:00:00Z`).getTime();
    const co = new Date(`${checkOut}T00:00:00Z`).getTime();
    return Math.max(0, Math.round((co - ci) / 86_400_000));
  }, [checkIn, checkOut]);

  const rate = nightlyRate === "" ? room?.basePrice ?? 0 : Number(nightlyRate);
  const total = Math.round(rate * nights * 100) / 100;

  const warnings = useMemo(() => {
    const out: string[] = [];
    if (room && (room.status === "MAINTENANCE" || room.status === "BLOCKED")) {
      out.push(`${room.number} odası ${ROOM_STATUS_LABELS[room.status]} — yeni rezervasyon alınmamalı!`);
    }
    if (room && adults + children > room.maxGuests) {
      out.push(`Kişi sayısı (${adults + children}) oda kapasitesini (${room.maxGuests}) aşıyor — sunucu reddedecek.`);
    }
    if (nights >= 1 && checkIn && checkIn < new Date().toISOString().slice(0, 10)) {
      out.push("Giriş tarihi geçmişte kaldı.");
    }
    return out;
  }, [room, adults, children, nights, checkIn]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nights < 1) {
      setError("Çıkış tarihi girişten sonra olmalı.");
      return;
    }
    setConfirming(true);
  }

  async function doCreate() {
    if (!room) return;
    setBusy(true);
    setError(null);
    const res = await createReservationAction({
      hotelId,
      roomId: room.id,
      checkIn,
      checkOut,
      adults,
      children,
      nightlyRate: rate,
      profile: { firstName, lastName, email, phone: phone || undefined, identityNo: identityNo || undefined, nationality: nationality || undefined, address: address || undefined },
      notes: notes || undefined,
    });
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/admin/pms/reservations/${res.bookingId}`);
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-lg">Konaklama</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="nr-hotel" className="label">Otel</label>
              <select id="nr-hotel" value={hotelId} onChange={(e) => { setHotelId(e.target.value); setRoomId(""); }} className="input">
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="nr-room" className="label">Oda</label>
              <select id="nr-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input" required>
                <option value="" disabled>Seçin…</option>
                {hotelRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.roomTypeName} · {r.maxGuests} kişi {r.status === "MAINTENANCE" || r.status === "BLOCKED" ? ` (${ROOM_STATUS_LABELS[r.status]})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nr-ci" className="label">Giriş Tarihi</label>
                <input id="nr-ci" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" required />
              </div>
              <div>
                <label htmlFor="nr-co" className="label">Çıkış Tarihi</label>
                <input id="nr-co" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nr-adults" className="label">Yetişkin</label>
                <input id="nr-adults" type="number" min={1} max={10} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label htmlFor="nr-ch" className="label">Çocuk</label>
                <input id="nr-ch" type="number" min={0} max={6} value={children} onChange={(e) => setChildren(Number(e.target.value))} className="input" />
              </div>
            </div>
            <div>
              <label htmlFor="nr-rate" className="label">Gecelik Fiyat (₾)</label>
              <input
                id="nr-rate"
                type="number"
                min={0}
                step={0.01}
                value={nightlyRate}
                placeholder={room ? String(room.basePrice) : ""}
                onChange={(e) => setNightlyRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="input"
              />
              <p className="mt-1 text-xs text-ink-muted">Boş bırakılırsa tip fiyatı kullanılır.</p>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg">Misafir Bilgileri</h2>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nr-fn" className="label">Ad</label>
                <input id="nr-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" required maxLength={60} />
              </div>
              <div>
                <label htmlFor="nr-ln" className="label">Soyad</label>
                <input id="nr-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" required maxLength={60} />
              </div>
            </div>
            <div>
              <label htmlFor="nr-email" className="label">E-posta</label>
              <input id="nr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nr-phone" className="label">Telefon</label>
                <input id="nr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" maxLength={30} />
              </div>
              <div>
                <label htmlFor="nr-id" className="label">TC / Kimlik No</label>
                <input id="nr-id" value={identityNo} onChange={(e) => setIdentityNo(e.target.value)} className="input" maxLength={30} />
              </div>
            </div>
            <div>
              <label htmlFor="nr-nat" className="label">Uyruk</label>
              <input id="nr-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} className="input" maxLength={60} />
            </div>
            <div>
              <label htmlFor="nr-addr" className="label">Adres</label>
              <input id="nr-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="input" maxLength={300} />
            </div>
            <div>
              <label htmlFor="nr-notes" className="label">Not</label>
              <textarea id="nr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-20" maxLength={500} />
            </div>
          </div>
        </section>

        {(warnings.length > 0 || error) && (
          <div className="lg:col-span-2 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">⚠ {w}</div>
            ))}
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
            )}
          </div>
        )}

        <div className="lg:col-span-2 flex items-center justify-between rounded-xl border border-sand-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest2 text-ink-muted">Özet</p>
            <p className="font-display text-xl">
              {nights} gece × {formatMoney(rate)} = <strong>{formatMoney(total)}</strong>
            </p>
          </div>
          <button type="submit" className="btn-primary !px-6 !py-2.5 text-sm" disabled={!room || nights < 1}>
            Rezervasyon Oluştur
          </button>
        </div>
      </form>

      {/* Onay modalı */}
      {confirming && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lift">
            <h3 className="font-display text-xl">Onay</h3>
            <p className="mt-3 text-sm">
              <strong>{room.number}</strong> odası, <strong>{firstName} {lastName}</strong> için{" "}
              <strong>{checkIn} → {checkOut}</strong> ({nights} gece, {formatMoney(total)}) rezervasyonu oluşturulacak.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="btn-ghost !px-4 !py-2 text-xs">Vazgeç</button>
              <button type="button" onClick={doCreate} disabled={busy} className="btn-primary !px-4 !py-2 text-xs">
                {busy ? "Oluşturuluyor…" : "Onayla ve Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
