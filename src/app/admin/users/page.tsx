import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ROLE_LABELS, getRolePermissions, type AdminRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "users.view")) redirect("/admin/no-access");

  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Access control</p>
      <h1 className="mt-1 font-display text-3xl">Users & roles</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[u.role as AdminRole]}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-[10px] font-medium uppercase tracking-widest2 ${u.isActive ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                    {u.isActive ? "Active" : u.passwordHash === "SETUP_PENDING" ? "Setup pending" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-2xl">Role permission matrix</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
          <div key={role} className="card p-5">
            <h3 className="font-medium">{ROLE_LABELS[role]}</h3>
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              {getRolePermissions(role).map((p) => (
                <li key={p} className="font-mono">{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Invite new users by running <code className="font-mono">npm run admin:create</code> with a different ADMIN_BOOTSTRAP_EMAIL, then change their role here (UI: next iteration). Every permission is enforced server-side on every endpoint.
      </p>
    </div>
  );
}
