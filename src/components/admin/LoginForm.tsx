"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await loginAdmin({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError(res.error === "LOCKED" ? "Account temporarily locked. Try again later." : "Invalid email or password.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 border border-ink-soft bg-ink-soft/30 p-6">
      <div>
        <label htmlFor="a-email" className="label !text-sand-200/70">Email</label>
        <input id="a-email" name="email" type="email" required autoComplete="username" className="input !border-ink-soft !bg-ink !text-cream" />
      </div>
      <div>
        <label htmlFor="a-pass" className="label !text-sand-200/70">Password</label>
        <input id="a-pass" name="password" type="password" required autoComplete="current-password" className="input !border-ink-soft !bg-ink !text-cream" />
      </div>
      {error && <p role="alert" className="border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
