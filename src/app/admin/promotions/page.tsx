import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "rates.view")) redirect("/admin/no-access");

  const promos = await db.promotion.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Pazarlama</p>
      <h1 className="mt-1 font-display text-3xl">Kampanyalar & Promosyon Kodları</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-widest2 text-ink-muted">
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Ad</th>
              <th className="px-4 py-3">İndirim</th>
              <th className="px-4 py-3">Min. Gece</th>
              <th className="px-4 py-3">Kullanım</th>
              <th className="px-4 py-3">Konaklama Aralığı</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {promos.map((p) => (
              <tr key={p.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-mono font-medium">{p.code}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.discountType === "PERCENT" ? `${Number(p.discountValue)}%` : `₾${Number(p.discountValue)}`}</td>
                <td className="px-4 py-3">{p.minNights}</td>
                <td className="px-4 py-3">{p.usageCount}{p.maxUsage ? ` / ${p.maxUsage}` : ""}</td>
                <td className="px-4 py-3 text-xs">
                  {p.stayDateFrom ? p.stayDateFrom.toISOString().slice(0, 10) : "—"} → {p.stayDateTo ? p.stayDateTo.toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-[10px] font-medium uppercase tracking-widest2 ${p.isActive ? "bg-green-50 text-green-800" : "bg-sand-100 text-ink-muted"}`}>
                    {p.isActive ? "Aktif" : "Duraklatıldı"}
                  </span>
                  {p.isDemo && <span className="badge-demo ml-1">DEMO</span>}
                </td>
              </tr>
            ))}
            {promos.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-ink-muted">Henüz kampanya yok.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Promosyon kodları rezervasyon oluşturulurken sunucu tarafında doğrulanır — tarih aralığı, kullanım limiti, otel ve oda kısıtları uygulanır. Oluşturma/düzenleme arayüzü: sonraki sürüm.
      </p>
    </div>
  );
}
