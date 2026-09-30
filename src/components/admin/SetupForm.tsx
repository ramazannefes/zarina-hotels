"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeAdminSetup } from "@/app/admin/actions";

export default function SetupForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strong =
    password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    const res = await completeAdminSetup({ token, password });
    setBusy(false);
    if (res.ok) {
      router.push("/admin/login");
    } else {
      setError(
        res.error === "WEAK_PASSWORD"
          ? "Şifre çok zayıf — en az 12 karakter; büyük harf, küçük harf, rakam ve sembol içermeli."
          : res.error === "ALREADY_USED"
            ? "Bu kurulum bağlantısı daha önce kullanılmış."
            : "Kurulum bağlantısı geçersiz veya süresi dolmuş.",
      );
    }
  }

  if (!token) {
    return (
      <p className="mt-8 border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
        Kurulum anahtarı eksik. <code>npm run admin:create</code> ile yeni bir anahtar oluşturun.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 border border-ink-soft bg-ink-soft/30 p-6">
      <p className="text-xs leading-5 text-sand-200/70">
        İlk yönetici şifresini oluşturun. En az 12 karakter; büyük harf, küçük harf, rakam ve sembol içermeli.
      </p>
      <div>
        <label htmlFor="s-pass" className="label !text-sand-200/70">Yeni şifre</label>
        <input id="s-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="input !border-ink-soft !bg-ink !text-cream" />
      </div>
      <div>
        <label htmlFor="s-confirm" className="label !text-sand-200/70">Şifre (tekrar)</label>
        <input id="s-confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="input !border-ink-soft !bg-ink !text-cream" />
      </div>
      <ul className="space-y-1 text-[11px]" aria-live="polite">
        <li className={password.length >= 12 ? "text-green-400" : "text-sand-200/50"}>✓ 12+ karakter</li>
        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-green-400" : "text-sand-200/50"}>✓ Büyük &amp; küçük harf</li>
        <li className={/[0-9]/.test(password) ? "text-green-400" : "text-sand-200/50"}>✓ Rakam</li>
        <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-400" : "text-sand-200/50"}>✓ Sembol</li>
      </ul>
      {error && <p role="alert" className="border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy || !strong} className="btn-gold w-full disabled:opacity-40">
        {busy ? "Oluşturuluyor…" : "Yönetici Hesabını Oluştur"}
      </button>
    </form>
  );
}
