"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPaymentAction, deletePaymentAction, checkInAction, checkOutAction, cancelReservationAction, updateBookingNotesAction } from "@/app/admin/pms/actions";
import { formatMoney } from "@/lib/money";

type Props = {
  booking: {
    id: string;
    reference: string;
    status: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    internalNotes: string | null;
    specialRequests: string | null;
    total: number;
    paid: number;
    balance: number;
    source: string;
  };
  guest: { firstName: string; lastName: string; email: string; phone: string; country: string | null } | null;
  pmsProfile: { identityNo: string | null; nationality: string | null; address: string | null; notes: string | null } | null;
  assignments: { id: string; isActive: boolean; roomNumber: string; roomTypeName: string }[];
  payments: { id: string; amount: number; method: string; status: string; isManual: boolean; createdAt: string }[];
  freeRooms: { id: string; number: string; roomTypeName: string }[];
  perms: { canCheckin: boolean; canPayments: boolean; canCancel: boolean };
};

const STATUS_LABELS: Record<string, string> = {
  PMS_HOLD: "Bekliyor",
  CONFIRMED: "Onaylandı",
  CHECKED_IN: "Konaklıyor",
  CHECKED_OUT: "Çıkış Yapıldı",
  CANCELLED: "İptal",
  NO_SHOW: "No-show",
  HOLDING: "Online (Beklemede)",
  PENDING_PAYMENT: "Online (Ödeme Bekliyor)",
};

const METHOD_OPTIONS = [
  { value: "CASH", label: "Nakit" },
  { value: "CREDIT_CARD", label: "Kredi Kartı" },
  { value: "BANK_TRANSFER", label: "Banka Transferi" },
  { value: "WIRE", label: "Havale/EFT" },
  { value: "OTHER", label: "Diğer" },
];

export default function ReservationDetailView({ booking, guest, pmsProfile, assignments, payments, freeRooms, perms }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [payAmount, setPayAmount] = useState(booking.balance > 0 ? String(booking.balance) : "");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [checkinRoomId, setCheckinRoomId] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [notes, setNotes] = useState(booking.internalNotes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function doCheckIn() {
    const res = await checkInAction({ bookingId: booking.id, roomId: checkinRoomId || undefined });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else setMessage({ type: "ok", text: "Check-in tamamlandı, oda DOLU olarak işaretlendi." });
    refresh();
  }

  async function doCheckOut() {
    if (!window.confirm("Check-out yapmak istediğinize emin misiniz? Oda temizlik listesine eklenecek.")) return;
    const res = await checkOutAction({ bookingId: booking.id });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else setMessage({ type: "ok", text: "Check-out tamamlandı. Oda KİRLİ işaretlendi ve housekeeping görevi oluşturuldu." });
    refresh();
  }

  async function doCancel() {
    setShowCancel(false);
    const res = await cancelReservationAction({ bookingId: booking.id });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else setMessage({ type: "ok", text: "Rezervasyon iptal edildi, oda serbest bırakıldı." });
    refresh();
  }

  async function doAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: "err", text: "Geçerli bir tutar girin." });
      return;
    }
    const res = await addPaymentAction({ bookingId: booking.id, amount, method: payMethod as never, note: payNote || undefined });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else {
      setMessage({ type: "ok", text: `${formatMoney(amount)} ödeme kaydedildi.` });
      setPayNote("");
    }
    refresh();
  }

  async function doDeletePayment(paymentId: string) {
    if (!window.confirm("Bu ödeme kaydını silmek istediğinize emin misiniz?")) return;
    const res = await deletePaymentAction({ paymentId, bookingId: booking.id });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else setMessage({ type: "ok", text: "Ödeme kaydı silindi." });
    refresh();
  }

  async function doSaveNotes() {
    const res = await updateBookingNotesAction({ bookingId: booking.id, notes });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else {
      setMessage({ type: "ok", text: "Notlar kaydedildi." });
      setEditingNotes(false);
    }
    refresh();
  }

  const canCheckInNow = perms.canCheckin && (booking.status === "PMS_HOLD" || booking.status === "CONFIRMED");
  const canCheckOutNow = perms.canCheckin && booking.status === "CHECKED_IN";

  const activeAssignment = assignments.find((a) => a.isActive);

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      {/* Sol: misafir + konaklama */}
      <div className="space-y-6 xl:col-span-2">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Durum: {STATUS_LABELS[booking.status] ?? booking.status}</h2>
            <span className="text-xs text-ink-muted">{booking.nights} gece · {booking.adults} yetişkin{booking.children ? ` + ${booking.children} çocuk` : ""}</span>
          </div>

          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Giriş" value={fmtDate(booking.checkIn)} />
            <Row label="Çıkış" value={fmtDate(booking.checkOut)} />
            <Row label="Oda" value={activeAssignment ? `${activeAssignment.roomNumber} (${activeAssignment.roomTypeName})` : "Atanmadı"} />
            {guest && (
              <>
                <Row label="Misafir" value={`${guest.firstName} ${guest.lastName}`} />
                <Row label="E-posta" value={guest.email} />
                <Row label="Telefon" value={guest.phone || "—"} />
                {pmsProfile?.identityNo && <Row label="TC / Kimlik" value={pmsProfile.identityNo} />}
                {pmsProfile?.nationality && <Row label="Uyruk" value={pmsProfile.nationality} />}
                {pmsProfile?.address && <Row label="Adres" value={pmsProfile.address} />}
              </>
            )}
            {booking.specialRequests && <Row label="Talepler" value={booking.specialRequests} />}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {canCheckInNow && (
              <div className="flex items-center gap-2">
                {assignments.length === 0 && freeRooms.length > 0 && (
                  <select value={checkinRoomId} onChange={(e) => setCheckinRoomId(e.target.value)} className="input !w-48 !py-2 text-xs" aria-label="Check-in odası">
                    <option value="">Oda seç…</option>
                    {freeRooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.roomTypeName}</option>)}
                  </select>
                )}
                <button type="button" onClick={doCheckIn} disabled={pending} className="btn-emerald !px-4 !py-2 text-xs">✓ Check-in Yap</button>
              </div>
            )}
            {canCheckOutNow && (
              <button type="button" onClick={doCheckOut} disabled={pending} className="btn-ghost !px-4 !py-2 text-xs">→ Check-out Yap</button>
            )}
            {perms.canCancel && (booking.status === "PMS_HOLD" || booking.status === "CONFIRMED") && (
              <button type="button" onClick={() => setShowCancel(true)} disabled={pending} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                ✕ Rezervasyonu İptal Et
              </button>
            )}
          </div>

          {message && (
            <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`} role="status">
              {message.text}
              <button type="button" onClick={() => setMessage(null)} className="float-right font-bold" aria-label="Kapat">×</button>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl">Ödemeler</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-sand-200">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5">{fmtDate(p.createdAt.slice(0, 10))}</td>
                  <td className="py-2.5">{p.method}</td>
                  <td className="py-2.5 text-xs text-ink-muted">{p.status === "PAID" ? "Tahsil edildi" : p.status}</td>
                  <td className="py-2.5 text-right font-medium">{formatMoney(p.amount)}</td>
                  <td className="w-10 py-2.5 text-right">
                    {perms.canPayments && p.isManual && p.status === "PAID" && (
                      <button type="button" onClick={() => doDeletePayment(p.id)} className="text-red-500 hover:text-red-700" aria-label="Ödemeyi sil">×</button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="py-4 text-xs text-ink-muted">Henüz ödeme yok.</td></tr>}
            </tbody>
          </table>

          {perms.canPayments && booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" && (
            <form onSubmit={doAddPayment} className="mt-4 flex flex-wrap items-end gap-2 border-t border-sand-200 pt-4">
              <div>
                <label htmlFor="pay-amt" className="label">Tutar (₾)</label>
                <input id="pay-amt" type="number" min={0} step={0.01} max={booking.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input !w-32 !py-2" required />
              </div>
              <div>
                <label htmlFor="pay-method" className="label">Yöntem</label>
                <select id="pay-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="input !w-40 !py-2">
                  {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="pay-note" className="label">Not</label>
                <input id="pay-note" value={payNote} onChange={(e) => setPayNote(e.target.value)} className="input !py-2" maxLength={300} />
              </div>
              <button type="submit" disabled={pending} className="btn-primary !px-4 !py-2 text-xs">+ Ödeme Ekle</button>
            </form>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Dahili Notlar</h2>
            {!editingNotes && (
              <button type="button" onClick={() => setEditingNotes(true)} className="text-xs text-gold-600 hover:underline">Düzenle</button>
            )}
          </div>
          {editingNotes ? (
            <div className="mt-3">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-24" maxLength={1000} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={doSaveNotes} disabled={pending} className="btn-primary !px-4 !py-2 text-xs">Kaydet</button>
                <button type="button" onClick={() => { setEditingNotes(false); setNotes(booking.internalNotes ?? ""); }} className="btn-ghost !px-4 !py-2 text-xs">Vazgeç</button>
              </div>
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{booking.internalNotes || "—"}</p>
          )}
        </section>
      </div>

      {/* Sağ: finans paneli */}
      <aside className="space-y-6">
        <section className="card p-6">
          <h2 className="font-display text-xl">Finansal Özet</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Genel Toplam" value={formatMoney(booking.total)} strong />
            <Row label="Tahsil Edilen" value={formatMoney(booking.paid)} />
            <Row
              label="Kalan Cari"
              value={formatMoney(Math.max(0, booking.balance))}
              strong={booking.balance > 0}
            />
            <Row
              label="Ödeme Durumu"
              value={
                booking.balance > 0.005
                  ? booking.paid > 0
                    ? "Kısmi Ödeme"
                    : "Ödenmedi"
                  : booking.balance < -0.005
                    ? "Fazla Ödeme"
                    : "Ödendi"
              }
            />
          </dl>
          {booking.balance > 0.005 && (
            <button
              type="button"
              onClick={() => setPayAmount(String(Math.round(booking.balance * 100) / 100))}
              className="mt-3 w-full rounded-lg border border-sand-300 px-3 py-2 text-xs font-medium text-ink-soft hover:bg-sand-50"
            >
              Kalanı tahsil et: {formatMoney(booking.balance)}
            </button>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl">Oda Atamaları</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {assignments.map((a) => (
              <li key={a.id} className={`rounded border px-3 py-2 ${a.isActive ? "border-emerald-200 bg-emerald-50" : "border-sand-200 text-ink-muted line-through"}`}>
                {a.roomNumber} · {a.roomTypeName} {a.isActive ? "(aktif)" : "(bırakıldı)"}
              </li>
            ))}
            {assignments.length === 0 && <li className="text-xs text-ink-muted">Henüz oda atanmadı.</li>}
          </ul>
          {pmsProfile?.notes && (
            <p className="mt-3 rounded bg-sand-50 px-3 py-2 text-xs text-ink-soft">Misafir notu: {pmsProfile.notes}</p>
          )}
        </section>
      </aside>

      {/* İptal onay modalı */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lift">
            <h3 className="font-display text-xl">İptal Onayı</h3>
            <p className="mt-3 text-sm">
              <strong>{booking.reference}</strong> referanslı rezervasyonu iptal etmek istediğinize emin misiniz?
              Oda serbest bırakılacak ve işlem kayıt altına alınacaktır.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCancel(false)} className="btn-ghost !px-4 !py-2 text-xs">Vazgeç</button>
              <button type="button" onClick={doCancel} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">Evet, İptal Et</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs uppercase tracking-widest2 text-ink-muted">{label}</dt>
      <dd className={`text-right ${strong ? "font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function fmtDate(d: string): string {
  return d.split("-").reverse().join(".");
}
