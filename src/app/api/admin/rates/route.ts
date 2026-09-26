// Admin rate update API — permission checked, audited, upserts DailyRate/RoomInventory.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionAdmin, AuthError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { parseDateOnly } from "@/lib/money";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomTypeId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive().max(1_000_000).optional(),
  stopSell: z.boolean().optional(),
  minStay: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) throw new AuthError("NOT_AUTHENTICATED");
    if (!hasPermission(admin.role, "rates.edit") && !hasPermission(admin.role, "availability.edit")) {
      throw new AuthError("FORBIDDEN", "rates.edit");
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
    const { roomTypeId, date, price, stopSell, minStay } = parsed.data;

    const room = await db.roomType.findUnique({ where: { id: roomTypeId } });
    if (!room) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const changes: Record<string, unknown> = {};
    if (price !== undefined) changes.price = price;
    if (stopSell !== undefined) changes.stopSell = stopSell;
    if (minStay !== undefined) changes.minStay = minStay;

    if (price !== undefined || minStay !== undefined) {
      await db.dailyRate.upsert({
        where: { roomTypeId_date: { roomTypeId, date: parseDateOnly(date) } },
        create: { roomTypeId, date: parseDateOnly(date), price: price ?? Number(room.basePrice), minStay: minStay ?? room.minStay, stopSell: stopSell ?? false },
        update: { ...(price !== undefined ? { price } : {}), ...(minStay !== undefined ? { minStay } : {}) },
      });
    }

    if (stopSell !== undefined) {
      const inventory = await db.roomInventory.findUnique({
        where: { roomTypeId_date: { roomTypeId, date: parseDateOnly(date) } },
      });
      await db.roomInventory.upsert({
        where: { roomTypeId_date: { roomTypeId, date: parseDateOnly(date) } },
        create: {
          roomTypeId,
          date: parseDateOnly(date),
          inventory: room.inventoryCount,
          stopSell,
        },
        update: { stopSell },
      });
    }

    await audit({
      adminId: admin.id,
      action: "RATE_CHANGE",
      entity: "RoomType",
      entityId: roomTypeId,
      metadata: { date, ...changes },
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
