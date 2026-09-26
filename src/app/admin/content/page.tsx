import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import ContentEditor from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin.role, "content.view")) redirect("/admin/no-access");
  const canEdit = hasPermission(admin.role, "content.edit");

  const sp = await searchParams;
  const locale = typeof sp.locale === "string" && ["en", "ka", "tr"].includes(sp.locale) ? sp.locale : "en";

  const blocks = await db.contentBlock.findMany({
    where: { locale },
    orderBy: { key: "asc" },
  });

  return (
    <div className="p-6 lg:p-10">
      <p className="kicker">CMS</p>
      <h1 className="mt-1 font-display text-3xl">Content blocks</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Structured content for policies, homepage sections and announcements. Legal texts require owner review before publishing — placeholders are clearly marked.
      </p>

      <ContentEditor
        locale={locale}
        canEdit={canEdit}
        blocks={blocks.map((b) => ({ id: b.id, key: b.key, value: b.value, type: b.type, updatedAt: b.updatedAt.toISOString() }))}
      />
    </div>
  );
}
