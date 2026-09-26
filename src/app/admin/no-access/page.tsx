import Link from "next/link";
import { getSessionAdmin } from "@/lib/auth/session";
import { ROLE_LABELS, type AdminRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-10">
      <div className="card max-w-md p-10 text-center">
        <p className="kicker">403</p>
        <h1 className="mt-2 font-display text-3xl">Access denied</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Your role ({ROLE_LABELS[admin.role as AdminRole]}) does not include permission for this area. Contact a Super Admin if you believe this is an error.
        </p>
        <Link href="/admin" className="btn-primary mt-6 !px-5 !py-2.5 text-xs">Back to dashboard</Link>
      </div>
    </div>
  );
}
