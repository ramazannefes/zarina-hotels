import { Suspense } from "react";
import SetupForm from "@/components/admin/SetupForm";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-3xl text-cream">ZARINA</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest2 text-gold-300">Tek Kullanımlık Yönetici Kurulumu</p>
        </div>
        <Suspense fallback={<p className="mt-8 text-center text-sm text-sand-200/60">Yükleniyor…</p>}>
          <SetupForm token={token} />
        </Suspense>
      </div>
    </div>
  );
}
