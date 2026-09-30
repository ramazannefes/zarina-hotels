"use client";

// Admin notification bell — polls /api/admin/notifications, shows dropdown +
// toasts, plays a distinct Web Audio tone per event family:
//   • chime (çan)  → reservation / payment (gelir olayları)
//   • alert (uyarı) → operation / message / system
// Muted preference persists in localStorage; toasts auto-dismiss.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

type Props = { initialUnread: number };

const KIND_META: Record<string, { icon: string; tone: "chime" | "alert" }> = {
  reservation: { icon: "🛎️", tone: "chime" },
  payment: { icon: "💳", tone: "chime" },
  operation: { icon: "🧹", tone: "alert" },
  message: { icon: "✉️", tone: "alert" },
  system: { icon: "⚙️", tone: "alert" },
};

const POLL_MS = 15_000;

export default function NotificationBell({ initialUnread }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [muted, setMuted] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);

  // ── Two distinct tones (Web Audio, no assets) ──
  const playTone = useCallback(
    (tone: "chime" | "alert") => {
      if (muted) return;
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        audioCtx.current ??= new Ctor();
        const ctx = audioCtx.current;
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;

        if (tone === "chime") {
          // İki notalı yumuşak çan: E6 → G6
          [1318.5, 1568.0].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.18);
            gain.gain.linearRampToValueAtTime(0.22, now + i * 0.18 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.85);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.18);
            osc.stop(now + i * 0.18 + 0.9);
          });
        } else {
          // Çift vuruş uyarı: kısa, tok
          [0, 0.22].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(880, now + offset);
            osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.16);
            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.22);
          });
        }
      } catch {
        // ses oynatma hatası bildirimi engellememeli
      }
    },
    [muted],
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=12", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[]; unreadCount: number };
      setItems(data.items);
      setUnread(data.unreadCount);

      if (!primed.current) {
        // İlk yükleme: mevcut kayıtları "görülmüş" say, ses çalma
        for (const it of data.items) seenIds.current.add(it.id);
        primed.current = true;
        return;
      }
      const fresh = data.items.filter((it) => !it.readAt && !seenIds.current.has(it.id));
      for (const it of fresh) seenIds.current.add(it.id);
      if (fresh.length > 0) {
        // En yüksek öncelikli tonu çal: chime > alert
        const hasChime = fresh.some((it) => KIND_META[it.kind]?.tone === "chime");
        playTone(hasChime ? "chime" : "alert");
        setToasts((prev) => [...fresh.slice(0, 3), ...prev].slice(0, 4));
      }
    } catch {
      // polling hatası sessizce yutulur
    }
  }, [playTone]);

  useEffect(() => {
    const stored = localStorage.getItem("zarina_admin_muted");
    if (stored === "1") setMuted(true);
    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  async function markRead(id?: string) {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    void poll();
    router.refresh();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("zarina_admin_muted", next ? "1" : "0");
  }

  function openItem(it: NotificationItem) {
    if (!it.readAt) void markRead(it.id);
    setOpen(false);
    if (it.link) router.push(it.link);
  }

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded p-2 text-sand-200/80 transition-colors hover:text-gold-300"
        aria-label={`Bildirimler${unread > 0 ? ` (${unread} okunmamış)` : ""}`}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Kapat" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-xl border border-sand-200 bg-white shadow-lift max-lg:fixed max-lg:inset-x-3 max-lg:top-14 max-lg:mt-0 max-lg:w-auto">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
              <p className="text-sm font-semibold">Bildirimler</p>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={toggleMute} className="rounded px-1.5 py-1 hover:bg-sand-100" title={muted ? "Sesi aç" : "Sessize al"}>
                  {muted ? "🔇" : "🔔"}
                </button>
                {unread > 0 && (
                  <button type="button" onClick={() => markRead()} className="text-gold-600 hover:underline">
                    Tümünü okundu say
                  </button>
                )}
              </div>
            </div>
            <ul className="max-h-96 divide-y divide-sand-100 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => openItem(it)}
                    className={`flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-sand-50 ${!it.readAt ? "bg-sea-100/40" : ""}`}
                  >
                    <span aria-hidden className="mt-0.5 text-base">{KIND_META[it.kind]?.icon ?? "🔔"}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${!it.readAt ? "font-semibold" : "font-medium text-ink-soft"}`}>{it.title}</span>
                      {it.body && <span className="mt-0.5 block truncate text-xs text-ink-muted">{it.body}</span>}
                      <span className="mt-0.5 block text-[10px] text-ink-muted">{fmtTime(it.createdAt)}</span>
                    </span>
                    {!it.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden />}
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="px-4 py-8 text-center text-xs text-ink-muted">Henüz bildirim yok.</li>}
            </ul>
          </div>
        </>
      )}

      {/* Toast'lar (sağ üst, otomatik kaybolur) */}
      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-80 max-w-[92vw] flex-col gap-2 max-lg:right-3 max-lg:top-16" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lift ${
              KIND_META[t.kind]?.tone === "chime" ? "border-emerald-200 bg-white" : "border-amber-300 bg-white"
            }`}
          >
            <span aria-hidden className="text-lg">{KIND_META[t.kind]?.icon ?? "🔔"}</span>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setToasts((p) => p.filter((x) => x.id !== t.id)); if (t.link) router.push(t.link); }}>
              <span className="block truncate text-sm font-semibold">{t.title}</span>
              {t.body && <span className="mt-0.5 block line-clamp-2 text-xs text-ink-muted">{t.body}</span>}
            </button>
            <button type="button" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-lg leading-none text-ink-muted hover:text-ink" aria-label="Kapat">×</button>
          </div>
        ))}
      </div>
    </>
  );
}
