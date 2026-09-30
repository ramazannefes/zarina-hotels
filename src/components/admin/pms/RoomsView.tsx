"use client";

// Rooms management client view — table + card layout, filters, inline actions
// with confirmation dialogs. All mutations go through PMS server actions.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ROOM_STATUS_LABELS,
  ROOM_STATUS_CLASSES,
  HOUSEKEEPING_LABELS,
  HOUSEKEEPING_CLASSES,
} from "@/lib/pms/status";
import { formatMoney } from "@/lib/money";
import type { PhysicalRoomStatus, HousekeepingStatus } from "@prisma/client";
import {
  createRoomAction,
  setRoomStatusAction,
  setHousekeepingAction,
} from "@/app/admin/pms/actions";

export type RoomRow = {
  id: string;
  number: string;
  floor: number;
  status: PhysicalRoomStatus;
  housekeeping: HousekeepingStatus;
  blockReason: string | null;
  notes: string | null;
  hotelId: string;
  hotelName: string;
  roomTypeName: string;
  maxGuests: number;
  basePrice: number;
  isActive: boolean;
  guest: { firstName: string; lastName: string } | null;
  bookingId: string | null;
  reference: string | null;
  checkIn: string | null;
  checkOut: string | null;
  paid: number;
  total: number;
  balance: number;
  hasPendingTask: boolean;
};

type Props = {
  rows: RoomRow[];
  hotels: { id: string; name: string }[];
  roomTypes: { id: string; name: string; hotelId: string; maxGuests: number; basePrice: number }[];
  floors: number[];
  canManage: boolean;
  canHousekeeping: boolean;
  canCheckin: boolean;
  selectedRoomId: string;
};

export default function RoomsView({ rows, hotels, roomTypes, floors, canManage, canHousekeeping, selectedRoomId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterHk, setFilterHk] = useState<string>("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterHk && r.housekeeping !== filterHk) return false;
        if (search) {
          const s = search.toLowerCase();
          const hit =
            r.number.toLowerCase().includes(s) ||
            (r.guest && `${r.guest.firstName} ${r.guest.lastName}`.toLowerCase().includes(s)) ||
            r.roomTypeName.toLowerCase().includes(s);
          if (!hit) return false;
        }
        return true;
      }),
    [rows, filterStatus, filterHk, search],
  );

  const selected = selectedRoomId ? rows.find((r) => r.id === selectedRoomId) : undefined;

  async function changeStatus(row: RoomRow, status: PhysicalRoomStatus) {
    if (status === "MAINTENANCE" || status === "BLOCKED") {
      const reason = window.prompt(`"${row.number}" için ${ROOM_STATUS_LABELS[status]} sebebi:`);
      if (reason === null) return;
      const res = await setRoomStatusAction({ roomId: row.id, status, blockReason: reason || undefined });
      if (!res.ok) setMessage({ type: "err", text: res.message });
      else if ("warning" in res && res.warning) setMessage({ type: "err", text: res.warning });
      else setMessage({ type: "ok", text: `${row.number} → ${ROOM_STATUS_LABELS[status]}` });
    } else if (row.status === "OCCUPIED" || row.status === "RESERVED" || row.status === "AWAITING_CHECKIN") {
      if (!window.confirm(`Oda ${row.number} aktif rezervasyona bağlı. Durumu ${ROOM_STATUS_LABELS[status]} yapmak istediğinize emin misiniz?`)) return;
      const res = await setRoomStatusAction({ roomId: row.id, status });
      if (!res.ok) setMessage({ type: "err", text: res.message });
      else setMessage({ type: "ok", text: `${row.number} → ${ROOM_STATUS_LABELS[status]}` });
    } else {
      const res = await setRoomStatusAction({ roomId: row.id, status });
      if (!res.ok) setMessage({ type: "err", text: res.message });
      else setMessage({ type: "ok", text: `${row.number} → ${ROOM_STATUS_LABELS[status]}` });
    }
    startTransition(() => router.refresh());
  }

  async function changeHousekeeping(row: RoomRow, hk: HousekeepingStatus) {
    const res = await setHousekeepingAction({ roomId: row.id, housekeeping: hk });
    if (!res.ok) setMessage({ type: "err", text: res.message });
    else setMessage({ type: "ok", text: `${row.number} temizlik → ${HOUSEKEEPING_LABELS[hk]}` });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6">
      {/* Filtre çubuğu */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Oda no, misafir veya tip ara…"
          className="input !w-64 !py-2"
          aria-label="Ara"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input !w-40 !py-2" aria-label="Durum filtresi">
          <option value="">Tüm durumlar</option>
          {Object.entries(ROOM_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filterHk} onChange={(e) => setFilterHk(e.target.value)} className="input !w-40 !py-2" aria-label="Temizlik filtresi">
          <option value="">Tüm temizlik</option>
          {Object.entries(HOUSEKEEPING_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="ml-auto flex rounded-lg border border-sand-300 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`rounded px-3 py-1.5 text-xs font-medium ${view === "cards" ? "bg-ink text-cream" : "text-ink-muted"}`}
          >
            Kart
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded px-3 py-1.5 text-xs font-medium ${view === "table" ? "bg-ink text-cream" : "text-ink-muted"}`}
          >
            Tablo
          </button>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowAddRoom(true)} className="btn-primary !px-4 !py-2 text-xs">
            + Oda Ekle
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
          role="status"
        >
          {message.text}
          <button type="button" onClick={() => setMessage(null)} className="float-right font-bold" aria-label="Kapat">×</button>
        </div>
      )}

      {/* Kart görünümü */}
      {view === "cards" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((r) => (
            <article key={r.id} className={`card p-5 ${r.id === selectedRoomId ? "ring-2 ring-gold-400" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest2 text-ink-muted">
                    {r.roomTypeName}
                  </span>
                  <p className="mt-1 font-display text-3xl font-bold">{r.number}</p>
                  <p className="text-xs text-ink-muted">{r.floor}. kat · {r.maxGuests} kişi</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${ROOM_STATUS_CLASSES[r.status]}`}>
                  {ROOM_STATUS_LABELS[r.status]}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded border px-2 py-0.5 text-[10px] ${HOUSEKEEPING_CLASSES[r.housekeeping]}`}>
                  {HOUSEKEEPING_LABELS[r.housekeeping]}
                </span>
                {r.hasPendingTask && <span className="text-[10px] text-amber-600">⚡ görev var</span>}
              </div>

              <div className="mt-3 min-h-[52px] border-t border-sand-200 pt-3">
                {r.guest ? (
                  <>
                    <p className="text-sm font-medium">{r.guest.firstName} {r.guest.lastName}</p>
                    <p className="text-xs text-ink-muted">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</p>
                  </>
                ) : (
                  <p className="rounded border border-dashed border-sand-300 px-2 py-2.5 text-center text-xs text-ink-muted">
                    {r.status === "MAINTENANCE" || r.status === "BLOCKED" ? (r.blockReason || "Kullanım dışı") : "Check-in'e hazır"}
                  </p>
                )}
              </div>

              {r.bookingId && (
                <div className="mt-2 text-xs text-ink-muted">
                  <p>{formatMoney(r.total)} toplam · tahsilat {formatMoney(r.paid)}</p>
                  <p className={r.balance > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
                    {r.balance > 0 ? `Cari: ${formatMoney(r.balance)}` : "Ödeme tamam"}
                  </p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {canHousekeeping && r.housekeeping !== "CLEAN" && (
                  <button type="button" disabled={pending} onClick={() => changeHousekeeping(r, "CLEAN")} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100">
                    Temiz Yap
                  </button>
                )}
                {canHousekeeping && r.housekeeping === "CLEAN" && (
                  <button type="button" disabled={pending} onClick={() => changeHousekeeping(r, "DIRTY")} className="rounded border border-sand-300 px-2 py-1 text-[11px] text-ink-muted hover:bg-sand-50">
                    Kirli Yap
                  </button>
                )}
                {canManage && r.status !== "MAINTENANCE" && (
                  <button type="button" disabled={pending} onClick={() => changeStatus(r, "MAINTENANCE")} className="rounded border border-sand-300 px-2 py-1 text-[11px] text-ink-soft hover:bg-sand-50">
                    Bakıma Al
                  </button>
                )}
                {canManage && (r.status === "MAINTENANCE" || r.status === "BLOCKED") && (
                  <button type="button" disabled={pending} onClick={() => changeStatus(r, "FREE")} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100">
                    Servise Al
                  </button>
                )}
              </div>
            </article>
          ))}
          {filtered.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink-muted">Filtreye uyan oda yok.</p>}
        </div>
      )}

      {/* Tablo görünümü */}
      {view === "table" && (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
                <th className="px-4 py-3">Oda</th>
                <th className="px-4 py-3">Kat</th>
                <th className="px-4 py-3">Tip</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Temizlik</th>
                <th className="px-4 py-3">Misafir</th>
                <th className="px-4 py-3">Giriş → Çıkış</th>
                <th className="px-4 py-3 text-right">Fiyat</th>
                <th className="px-4 py-3 text-right">Tahsilat</th>
                <th className="px-4 py-3 text-right">Cari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-sand-50">
                  <td className="px-4 py-3 font-bold">{r.number}</td>
                  <td className="px-4 py-3">{r.floor}</td>
                  <td className="px-4 py-3 text-xs">{r.roomTypeName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${ROOM_STATUS_CLASSES[r.status]}`}>
                      {ROOM_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-0.5 text-[10px] ${HOUSEKEEPING_CLASSES[r.housekeeping]}`}>
                      {HOUSEKEEPING_LABELS[r.housekeeping]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.checkIn ? `${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}` : "—"}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(r.basePrice)}</td>
                  <td className="px-4 py-3 text-right">{r.bookingId ? formatMoney(r.paid) : "—"}</td>
                  <td className={`px-4 py-3 text-right ${r.balance > 0 ? "font-semibold text-red-600" : ""}`}>
                    {r.bookingId ? formatMoney(r.balance) : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-xs text-ink-muted">Filtreye uyan oda yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Detay drawer (basit panel) */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label={`Oda ${selected.number} detay`}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Oda {selected.number}</h2>
              <button type="button" onClick={() => router.push("/admin/pms/rooms")} className="text-2xl text-ink-muted hover:text-ink" aria-label="Kapat">×</button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Detail label="Otel" value={selected.hotelName} />
              <Detail label="Tip" value={selected.roomTypeName} />
              <Detail label="Kat" value={String(selected.floor)} />
              <Detail label="Durum" value={ROOM_STATUS_LABELS[selected.status]} />
              <Detail label="Temizlik" value={HOUSEKEEPING_LABELS[selected.housekeeping]} />
              <Detail label="Misafir" value={selected.guest ? `${selected.guest.firstName} ${selected.guest.lastName}` : "—"} />
              <Detail label="Konaklama" value={selected.checkIn ? `${selected.checkIn} → ${selected.checkOut}` : "—"} />
              <Detail label="Günlük fiyat" value={formatMoney(selected.basePrice)} />
              <Detail label="Toplam / Tahsilat / Cari" value={`${formatMoney(selected.total)} / ${formatMoney(selected.paid)} / ${formatMoney(selected.balance)}`} />
              {selected.notes && <Detail label="Not" value={selected.notes} />}
              {selected.blockReason && <Detail label="Bloke sebebi" value={selected.blockReason} />}
            </dl>
            {selected.bookingId && (
              <a href={`/admin/pms/reservations/${selected.bookingId}`} className="btn-ghost mt-4 !px-4 !py-2 text-xs">
                Rezervasyona Git →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Oda ekleme modalı */}
      {showAddRoom && (
        <AddRoomModal
          hotels={hotels}
          roomTypes={roomTypes}
          onClose={() => setShowAddRoom(false)}
          onCreated={(msg) => {
            setShowAddRoom(false);
            setMessage({ type: "ok", text: msg });
            startTransition(() => router.refresh());
          }}
          onError={(msg) => setMessage({ type: "err", text: msg })}
        />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-sand-100 pb-2">
      <dt className="text-xs uppercase tracking-widest2 text-ink-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return `${d.slice(8)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

function AddRoomModal({
  hotels,
  roomTypes,
  onClose,
  onCreated,
  onError,
}: {
  hotels: { id: string; name: string }[];
  roomTypes: { id: string; name: string; hotelId: string; maxGuests: number; basePrice: number }[];
  onClose: () => void;
  onCreated: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? "");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState(1);
  const [busy, setBusy] = useState(false);

  const hotelRoomTypes = roomTypes.filter((rt) => rt.hotelId === hotelId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createRoomAction({ hotelId, roomTypeId: roomTypeId || hotelRoomTypes[0]?.id, number, floor });
    setBusy(false);
    if (!res.ok) {
      onError(res.message);
      return;
    }
    onCreated(`${number.toUpperCase()} odası eklendi.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-lift">
        <h2 className="font-display text-xl">Yeni Oda</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="ar-hotel" className="label">Otel</label>
            <select id="ar-hotel" value={hotelId} onChange={(e) => { setHotelId(e.target.value); setRoomTypeId(""); }} className="input">
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ar-type" className="label">Oda Tipi</label>
            <select id="ar-type" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} className="input" required>
              <option value="" disabled>Seçin…</option>
              {hotelRoomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name} ({rt.maxGuests} kişi, {formatMoney(rt.basePrice)})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ar-number" className="label">Oda No</label>
              <input id="ar-number" value={number} onChange={(e) => setNumber(e.target.value)} className="input" required maxLength={10} />
            </div>
            <div>
              <label htmlFor="ar-floor" className="label">Kat</label>
              <input id="ar-floor" type="number" value={floor} onChange={(e) => setFloor(Number(e.target.value))} className="input" min={-2} max={50} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost !px-4 !py-2 text-xs">İptal</button>
          <button type="submit" disabled={busy} className="btn-primary !px-4 !py-2 text-xs">{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </form>
    </div>
  );
}
