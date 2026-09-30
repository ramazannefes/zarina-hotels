import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "reviews.moderate")) redirect("/admin/no-access");

  const reviews = await db.review.findMany({ orderBy: { createdAt: "desc" }, include: { hotel: { select: { name: true } } } });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Moderasyon</p>
      <h1 className="mt-1 font-display text-3xl">Misafir Yorumları</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Sitede yalnızca personel tarafından doğrulanmış ve yayınlanmış yorumlar görünür. Kaynağı kaydedin (ör. herkese açık OTA yorumundan aktarıldı) ve kaynak bilgisini koruyun.
      </p>

      <div className="mt-6 space-y-3">
        {reviews.map((r) => (
          <article key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {"★".repeat(r.rating)} <span className="text-ink-muted">·</span> {r.guestName}{r.country ? `, ${r.country}` : ""}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-muted">{r.hotel.name}</span>
                <span className={`px-2 py-1 uppercase tracking-widest2 ${r.isPublished ? "bg-green-50 text-green-800" : "bg-sand-100 text-ink-muted"}`}>
                  {r.isPublished ? "Yayında" : "Beklemede"}
                </span>
              </div>
            </div>
            {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
            <p className="mt-1 text-sm text-ink-muted">{r.body}</p>
            <p className="mt-2 text-[11px] text-ink-muted">Kaynak: {r.source}{r.sourceRef ? ` · ${r.sourceRef}` : ""}</p>
          </article>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-ink-muted">
            Henüz yorum kaydı yok. Doğrulanmış misafir geri bildirimlerini buraya ekleyin — asla sahte referans üretilmez.
          </p>
        )}
      </div>
    </div>
  );
}
