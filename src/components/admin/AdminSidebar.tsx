"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = { role: string; roleLabel: string; name: string };

const MENU: { href: string; label: string; roles?: string[] }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/calendar", label: "Rates & Availability" },
  { href: "/admin/hotels", label: "Hotels" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/promotions", label: "Offers & Promo" },
  { href: "/admin/content", label: "Content", roles: ["CONTENT_MANAGER", "SUPER_ADMIN", "HOTEL_MANAGER"] },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics", roles: ["FINANCE", "SUPER_ADMIN", "HOTEL_MANAGER", "RESERVATION_MANAGER"] },
  { href: "/admin/users", label: "Users & Roles", roles: ["SUPER_ADMIN"] },
  { href: "/admin/audit", label: "Audit Logs", roles: ["SUPER_ADMIN", "FINANCE"] },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar({ role, roleLabel, name }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const items = MENU.filter((m) => !m.roles || m.roles.includes(role));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sand-200 bg-ink text-sand-100 max-lg:hidden">
      <div className="border-b border-ink-soft/60 px-5 py-5">
        <p className="font-display text-xl">ZARINA</p>
        <p className="text-[9px] uppercase tracking-widest2 text-gold-300">Admin Portal</p>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {items.map((m) => {
            const active = m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className={`block rounded px-3 py-2 text-sm transition-colors ${active ? "bg-gold-400/15 text-gold-300" : "text-sand-200/75 hover:bg-ink-soft/40 hover:text-cream"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-ink-soft/60 p-4 text-xs">
        <p className="font-medium text-cream">{name}</p>
        <p className="mt-0.5 text-sand-200/60">{roleLabel}</p>
        <button type="button" onClick={logout} className="mt-3 w-full border border-ink-soft px-3 py-2 text-xs uppercase tracking-widest2 text-sand-200/80 hover:border-gold-300 hover:text-gold-300">
          Sign out
        </button>
        <Link href="/" className="mt-2 block text-center text-[11px] text-sand-200/50 hover:text-gold-300">View site →</Link>
      </div>
    </aside>
  );
}
