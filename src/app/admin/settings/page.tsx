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
    { name: "Ödeme sağlayıcısı", value: paymentProvider, ok: paymentProvider !== "MOCK" || process.env.NODE_ENV !== "production", note: "MOCK yalnızca geliştirme içindir. Üretim için BOG/TBC anahtarlarını girin." },
    { name: "E-posta sağlayıcısı", value: emailProvider, ok: emailProvider !== "MOCK" || process.env.NODE_ENV !== "production", note: "MOCK yalnızca loglar. Yayın öncesi RESEND veya SMTP yapılandırın." },
    { name: "Veritabanı", value: process.env.DATABASE_URL ? "yapılandırıldı" : "eksik", ok: Boolean(process.env.DATABASE_URL) },
  ];

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Yapılandırma</p>
      <h1 className="mt-1 font-display text-3xl">Ayarlar</h1>

      <h2 className="mt-8 font-display text-xl">Entegrasyonlar</h2>
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

      <h2 className="mt-10 font-display text-xl">Kayıtlı Ayarlar</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Anahtar</th>
              <th className="px-4 py-3">Değer</th>
              <th className="px-4 py-3">Güncellenme</th>
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
            {settings.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-ink-muted">Henüz ayar kaydı yok.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card mt-8 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-medium">Sahip kontrol listesi — üretime çıkmadan önce:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          <li>Otel adresi, koordinatları ve Google Maps gömmesini doğrulayın</li>
          <li>Tüm yer tutucu medyayı resmi fotoğraflarla değiştirin</li>
          <li>Oda tipi başına gerçek oda stokunu girin</li>
          <li>Resmi iptal, rezervasyon ve gizlilik politikası metinlerini sağlayın</li>
          <li>BOG/TBC sanal POS hesabı açın ve ödeme anahtarlarını env'e girin</li>
          <li>RESEND/SMTP'yi bookings@ alan adıyla yapılandırın</li>
        </ul>
      </div>
    </div>
  );
}
