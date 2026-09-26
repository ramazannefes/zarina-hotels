"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RoomRow = { id: string; name: string; hotel: string; basePrice: number; inventoryCount: number };
type InvCell = { inventory: number; booked: number; held: number; stopSell: boolean };
type RateCell = { price: number; minStay: number | null };

type Props = {
  startDate: string;
  days: number;
  rooms: RoomRow[];
  invMap: Record<string, InvCell>;
  rateMap: Record<string, RateCell>;
  canEdit: boolean;
};

function dateList(start: string, days: number): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    out.push(new Date(s.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

export default function CalendarGrid({ startDate, days, rooms, invMap, rateMap, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const dates = dateList(startDate, days);

  async function saveCell(key: string, roomTypeId: string, date: string, newPrice: number) {
    setBusy(true);
    try {
      await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId, date, price: newPrice }),
      });
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStopSell(roomTypeId: string, date: string, current: boolean) {
    if (!canEdit) return;
    setBusy(true);
    try {
      await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId, date, stopSell: !current }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-sand-200 bg-white px-3 py-2 text-left">Room</th>
            {dates.map((d) => (
              <th key={d} className="border-b border-sand-200 px-1 py-2 text-center font-medium text-ink-muted">
                {d.slice(8)}.{d.slice(5, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-sand-100">
              <td className="sticky left-0 z-10 bg-white px-3 py-2">
                <p className="font-medium">{room.name}</p>
                <p className="text-[10px] text-ink-muted">{room.hotel} · inv {room.inventoryCount} · base ₾{room.basePrice}</p>
              </td>
              {dates.map((d) => {
                const inv = invMap[`${room.id}|${d}`];
                const rate = rateMap[`${room.id}|${d}`];
                const cellKey = `${room.id}|${d}`;
                const soldOut = inv ? inv.inventory - inv.booked - inv.held <= 0 : false;
                const displayPrice = rate?.price ?? room.basePrice;
                return (
                  <td
                    key={d}
                    className={`cursor-pointer px-1 py-2 text-center ${soldOut ? "bg-red-50 text-red-700" : inv?.stopSell ? "bg-amber-50 text-amber-800" : "hover:bg-sand-50"}`}
                    onClick={() => {
                      if (!canEdit) return;
                      setEditing(cellKey);
                      setPrice(String(displayPrice));
                    }}
                    title={canEdit ? "Click to edit price" : undefined}
                  >
                    {editing === cellKey ? (
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-14 border border-gold-400 px-1 py-0.5 text-xs"
                          min={0}
                          step={1}
                          aria-label="Daily price"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => saveCell(cellKey, room.id, d, Number(price))}
                          className="bg-gold-400 px-1 text-[10px]"
                          aria-label="Save price"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">₾{displayPrice}</span>
                        <span className="block text-[10px] text-ink-muted">
                          {inv ? `${inv.inventory - inv.booked - inv.held}/${inv.inventory}` : room.inventoryCount}
                          {inv?.stopSell ? " · SS" : ""}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-sand-200 px-4 py-3 text-[11px] text-ink-muted">
        Click a cell to edit the daily price. Red = sold out, amber = stop-sell. In-server validation applies; changes are audit-logged.
      </div>
    </div>
  );
}
