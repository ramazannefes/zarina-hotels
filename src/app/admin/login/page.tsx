import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";
import LoginForm from "@/components/admin/LoginForm";
import { TR_COMMON } from "@/lib/admin-i18n";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getSessionAdmin();
  if (admin) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-3xl text-cream">ZARINA</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest2 text-gold-300">{TR_COMMON.adminPortal}</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-[11px] text-sand-200/40">
          {TR_COMMON.authorizedOnly}
        </p>
      </div>
    </div>
  );
}
