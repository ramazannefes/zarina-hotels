import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "settings.edit")) redirect("/admin/no-access");

  const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
  const paymentProvider = process.env.PAYMENT_PROVIDER ?? "MOCK";
  const emailProvider = process.env.EMAIL_PROVIDER ?? "MOCK";

  const integrations = [
    { name: "Payment provider", value: paymentProvider, ok: paymentProvider !== "MOCK" || process.env.NODE_ENV !== "production", note: "MOCK is dev-only. Set BOG/TBC keys for production." },
    { name: "Email provider", value: emailProvider, ok: emailProvider !== "MOCK" || process.env.NODE_ENV !== "production", note: "MOCK logs only. Configure RESEND or SMTP before launch." },
    { name: "Database", value: process.env.DATABASE_URL ? "configured" : "missing", ok: Boolean(process.env.DATABASE_URL) },
  ];

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Configuration</p>
      <h1 className="mt-1 font-display text-3xl">Settings</h1>

      <h2 className="mt-8 font-display text-xl">Integrations</h2>
      <div className="mt-4 space-y-3">
        {integrations.map((i) => (
          <div key={i.name} className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">{i.name}</p>
              {i.note && <p className="text-xs text-ink-muted">{i.note}</p>}
            </div>
            <span className={`px-3 py-1 text-xs font-medium uppercase tracking-widest2 ${i.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
              {i.value}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-xl">Stored settings</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {settings.map((s) => (
              <tr key={s.key}>
                <td className="px-4 py-2.5 font-mono text-xs">{s.key}</td>
                <td className="px-4 py-2.5 max-w-[420px] truncate text-xs">{s.value}</td>
                <td className="px-4 py-2.5 text-xs">{s.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {settings.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-ink-muted">No settings stored yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card mt-8 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-medium">Owner checklist — before production:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          <li>Verify hotel address, coordinates & Google Maps embed (NEEDS ADMIN VERIFICATION)</li>
          <li>Replace all placeholder media with official photography</li>
          <li>Confirm real room inventory per room type</li>
          <li>Provide official cancellation, booking and privacy policy texts</li>
          <li>Open BOG/TBC merchant account and fill payment keys in env</li>
          <li>Configure RESEND/SMTP with bookings@ domain</li>
        </ul>
      </div>
    </div>
  );
}
