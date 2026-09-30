import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "messages.view")) redirect("/admin/no-access");

  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">Gelen Kutusu</p>
      <h1 className="mt-1 font-display text-3xl">İletişim Mesajları</h1>

      <div className="mt-6 space-y-3">
        {messages.map((m) => (
          <article key={m.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {m.name} <span className="text-xs text-ink-muted">· {m.email}{m.phone ? ` · ${m.phone}` : ""}</span>
              </p>
              <p className="text-xs text-ink-muted">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
            </div>
            <p className="mt-1 text-sm font-medium">{m.subject}</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{m.message}</p>
          </article>
        ))}
        {messages.length === 0 && <p className="text-sm text-ink-muted">Henüz mesaj yok.</p>}
      </div>
    </div>
  );
}
