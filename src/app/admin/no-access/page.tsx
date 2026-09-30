import Link from "next/link";
import { getSessionAdmin } from "@/lib/auth/session";
import { ROLE_LABELS, type AdminRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TR_COMMON } from "@/lib/admin-i18n";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-10">
      <div className="card max-w-md p-10 text-center">
        <p className="kicker">403</p>
        <h1 className="mt-2 font-display text-3xl">{TR_COMMON.accessDeniedTitle}</h1>
        <p className="mt-3 text-sm text-ink-muted">
          {TR_COMMON.accessDeniedBody} ({ROLE_LABELS[admin.role as AdminRole]})
        </p>
        <Link href="/admin" className="btn-primary mt-6 !px-5 !py-2.5 text-xs">{TR_COMMON.backToDashboard}</Link>
      </div>
    </div>
  );
}
