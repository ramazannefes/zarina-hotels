"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { TR_MENU, TR_COMMON } from "@/lib/admin-i18n";

type Props = { role: string; roleLabel: string; name: string };

export default function AdminSidebar({ role, roleLabel, name }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/admin/login");
    router.refresh();
  }

  const items = TR_MENU.filter((m) => !m.roles || m.roles.includes(role));

  const navList = (
    <nav aria-label="Yönetim" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-0.5">
        {items.map((m) => {
          const active = m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded px-3 py-2.5 text-sm transition-colors max-lg:py-3 ${active ? "bg-gold-400/15 text-gold-300" : "text-sand-200/75 hover:bg-ink-soft/40 hover:text-cream"}`}
                aria-current={active ? "page" : undefined}
              >
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const brand = (
    <div className="border-b border-ink-soft/60 px-5 py-5">
      <p className="font-display text-xl">ZARINA</p>
      <p className="text-[9px] uppercase tracking-widest2 text-gold-300">Yönetim Paneli</p>
    </div>
  );

  const userBox = (
    <div className="border-t border-ink-soft/60 p-4 text-xs">
      <p className="font-medium text-cream">{name}</p>
      <p className="mt-0.5 text-sand-200/60">{roleLabel}</p>
      <button type="button" onClick={logout} className="mt-3 w-full border border-ink-soft px-3 py-2 text-xs uppercase tracking-widest2 text-sand-200/80 hover:border-gold-300 hover:text-gold-300">
        {TR_COMMON.signOut}
      </button>
      <Link href="/" className="mt-2 block text-center text-[11px] text-sand-200/50 hover:text-gold-300">{TR_COMMON.viewSite}</Link>
    </div>
  );

  return (
    <>
      {/* Masaüstü sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-sand-200 bg-ink text-sand-100 max-lg:hidden">
        {brand}
        {navList}
        {userBox}
      </aside>

      {/* Mobil üst çubuk */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-ink-soft/60 bg-ink px-4 py-3 text-sand-100 lg:hidden">
        <div className="flex items-center gap-2">
          <p className="font-display text-lg">ZARINA</p>
          <span className="text-[9px] uppercase tracking-widest2 text-gold-300">Yönetim</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-1.5 rounded border border-ink-soft px-3 py-1.5 text-xs text-sand-200/80 hover:border-gold-300 hover:text-gold-300"
          aria-label="Menüyü aç"
          aria-expanded={mobileOpen}
        >
          <span aria-hidden>☰</span> Menü
        </button>
      </header>

      {/* Mobil drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Yönetim menüsü">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Kapat" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-ink text-sand-100 shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-soft/60 px-5 py-4">
              <p className="font-display text-lg">ZARINA</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-2xl leading-none text-sand-200/70 hover:text-cream" aria-label="Menüyü kapat">×</button>
            </div>
            {navList}
            {userBox}
          </div>
        </div>
      )}
    </>
  );
}
