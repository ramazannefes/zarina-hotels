import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionAdmin, AuthError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const bodySchema = z.object({
  key: z.string().trim().min(1).max(120).regex(/^[a-z0-9.\-]+$/),
  locale: z.enum(["en", "ka", "tr"]),
  value: z.string().max(50_000),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) throw new AuthError("NOT_AUTHENTICATED");
    if (!hasPermission(admin.role, "content.edit")) throw new AuthError("FORBIDDEN", "content.edit");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

    await db.contentBlock.upsert({
      where: { key_locale: { key: parsed.data.key, locale: parsed.data.locale } },
      create: { key: parsed.data.key, locale: parsed.data.locale, value: parsed.data.value },
      update: { value: parsed.data.value },
    });

    await audit({
      adminId: admin.id,
      action: "CONTENT_PUBLISH",
      entity: "ContentBlock",
      entityId: `${parsed.data.key}#${parsed.data.locale}`,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.code === "NOT_AUTHENTICATED" ? 401 : 403 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
