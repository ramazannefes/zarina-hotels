import { NextResponse } from "next/server";
import { logoutAdmin } from "@/app/admin/actions";

export const runtime = "nodejs";

export async function POST() {
  await logoutAdmin();
  return NextResponse.json({ ok: true });
}
