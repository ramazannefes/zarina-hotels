// Admin notifications API — list unread/latest + mark read.
// Authenticated admins only; housekeeping sees the same feed (ops events are shared).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionAdmin, AuthError } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) throw new AuthError("NOT_AUTHENTICATED");

    const url = new URL(req.url);
    const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10) || 12));

    const [items, unreadCount] = await Promise.all([
      db.adminNotification.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, kind: true, title: true, body: true, link: true, readAt: true, createdAt: true },
      }),
      db.adminNotification.count({ where: { readAt: null } }),
    ]);

    return NextResponse.json(
      { items, unreadCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.code === "NOT_AUTHENTICATED" ? 401 : 403 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

const markSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) throw new AuthError("NOT_AUTHENTICATED");

    const parsed = markSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

    if (parsed.data.all) {
      await db.adminNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
    } else if (parsed.data.id) {
      await db.adminNotification.updateMany({
        where: { id: parsed.data.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.code === "NOT_AUTHENTICATED" ? 401 : 403 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
