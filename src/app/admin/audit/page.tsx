import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "audit.view")) redirect("/admin/no-access");

  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { admin: { select: { name: true, email: true } } } });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Compliance</p>
      <h1 className="mt-1 font-display text-3xl">Audit logs</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-xs">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}Z</td>
                <td className="px-4 py-2.5">{l.admin?.name ?? "system"}</td>
                <td className="px-4 py-2.5 font-medium">{l.action}</td>
                <td className="px-4 py-2.5 text-xs">{l.entity}{l.entityId ? `#${l.entityId.slice(-6)}` : ""}</td>
                <td className="px-4 py-2.5 max-w-[280px] truncate text-xs text-ink-muted">{l.metadata ? JSON.stringify(l.metadata) : "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-ink-muted">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
