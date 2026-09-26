"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Block = { id: string; key: string; value: string; type: string; updatedAt: string };

export default function ContentEditor({ locale, canEdit, blocks }: { locale: string; canEdit: boolean; blocks: Block[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Block | null>(blocks[0] ?? null);
  const [value, setValue] = useState(blocks[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selected.key, locale, value }),
    });
    setBusy(false);
    if (res.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      const data = (await res.json()) as { error?: string };
      setMessage(data.error === "FORBIDDEN" ? "No permission." : "Save failed.");
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="card max-h-[70vh] overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {blocks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(b);
                  setValue(b.value);
                  setMessage(null);
                }}
                className={`w-full rounded px-3 py-2 text-left text-sm ${selected?.id === b.id ? "bg-gold-300/15 text-gold-600" : "hover:bg-sand-50"}`}
              >
                <span className="block font-medium">{b.key}</span>
                <span className="block text-[10px] uppercase tracking-widest2 text-ink-muted">{b.type}</span>
              </button>
            </li>
          ))}
          {blocks.length === 0 && <li className="px-3 py-4 text-xs text-ink-muted">No blocks for this locale yet.</li>}
        </ul>
      </div>
      <div className="card p-6">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-sm font-medium">{selected.key}</h2>
              <div className="flex gap-2 text-xs">
                {["en", "ka", "tr"].map((l) => (
                  <Link key={l} href={`/admin/content?locale=${l}`} className={`px-2 py-1 uppercase ${l === locale ? "bg-gold-300/20 text-gold-600" : "text-ink-muted hover:text-ink"}`}>
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={14}
              disabled={!canEdit}
              className="input mt-4 font-mono text-sm"
              aria-label={`Content for ${selected.key}`}
            />
            <div className="mt-4 flex items-center gap-3">
              {canEdit && (
                <button type="button" onClick={save} disabled={busy} className="btn-primary !px-5 !py-2 text-xs">
                  {busy ? "Saving…" : "Save"}
                </button>
              )}
              {message && <p className="text-xs text-ink-muted" role="status">{message}</p>}
              {!canEdit && <p className="text-xs text-amber-700">Read-only for your role.</p>}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Select a content block.</p>
        )}
      </div>
    </div>
  );
}
