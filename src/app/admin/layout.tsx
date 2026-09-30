import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { ROLE_LABELS, type AdminRole } from "@/lib/auth/permissions";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin — Zarina Hotels", template: "%s | Zarina Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  const unreadNotifications = admin
    ? await db.adminNotification.count({ where: { readAt: null } })
    : 0;
  // Login & setup pages render their own full-screen layout (see route group)
  return (
    <div className="flex min-h-screen bg-sand-50">
      {admin && (
        <AdminSidebar
          role={admin.role as AdminRole}
          roleLabel={ROLE_LABELS[admin.role]}
          name={admin.name}
          unreadNotifications={unreadNotifications}
        />
      )}
      <div className="flex-1 overflow-x-hidden pt-[57px] lg:pt-0">{children}</div>
    </div>
  );
}
