"use server";

// Admin server actions — authentication flows with audit logging.
// Server actions run POST server-side; permissions enforced per action.

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionAdmin,
  checkLoginThrottle,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export type LoginResult = { ok: true } | { ok: false; error: "INVALID" | "LOCKED" };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function loginAdmin(input: { email: string; password: string }): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const ip = await clientIp();
  const throttleKey = `${email}:${ip}`;

  if (!checkLoginThrottle(throttleKey).allowed) {
    await audit({ action: "LOGIN_FAILED", entity: "AdminUser", metadata: { email, reason: "throttled" }, ip });
    return { ok: false, error: "LOCKED" };
  }

  const admin = await db.adminUser.findUnique({ where: { email } });
  const valid = admin && admin.isActive && (await bcrypt.compare(input.password, admin.passwordHash));

  if (!valid || !admin) {
    recordLoginFailure(throttleKey);
    await audit({ action: "LOGIN_FAILED", entity: "AdminUser", metadata: { email }, ip });
    return { ok: false, error: "INVALID" };
  }

  clearLoginFailures(throttleKey);
  await createSession(admin.id, ip, (await headers()).get("user-agent") ?? undefined);
  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await audit({ adminId: admin.id, action: "LOGIN", entity: "AdminUser", entityId: admin.id, ip });
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const admin = await getSessionAdmin();
  if (admin) {
    await audit({ adminId: admin.id, action: "LOGOUT", entity: "AdminUser", entityId: admin.id, ip: await clientIp() });
  }
  await destroySession();
}

export type SetupResult = { ok: true } | { ok: false; error: "INVALID_TOKEN" | "WEAK_PASSWORD" | "ALREADY_USED" };

/**
 * One-time admin setup — token comes from the CLI (npm run admin:create).
 * Forces a strong password; token is single-use and expires in 24h.
 */
export async function completeAdminSetup(input: {
  token: string;
  password: string;
}): Promise<SetupResult> {
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(input.token).digest("hex");

  const pending = await db.adminPasswordReset.findUnique({ where: { tokenHash } });
  if (!pending || pending.usedAt || pending.expiresAt < new Date()) {
    return { ok: false, error: input.token ? "INVALID_TOKEN" : "INVALID_TOKEN" };
  }

  const admin = await db.adminUser.findUnique({ where: { id: pending.adminId } });
  if (!admin) return { ok: false, error: "INVALID_TOKEN" };
  if (admin.passwordHash !== "SETUP_PENDING") return { ok: false, error: "ALREADY_USED" };

  // Strong password policy
  const strong =
    input.password.length >= 12 &&
    /[a-z]/.test(input.password) &&
    /[A-Z]/.test(input.password) &&
    /[0-9]/.test(input.password) &&
    /[^A-Za-z0-9]/.test(input.password);
  if (!strong) return { ok: false, error: "WEAK_PASSWORD" };

  const passwordHash = await bcrypt.hash(input.password, 12);
  await db.$transaction([
    db.adminUser.update({ where: { id: admin.id }, data: { passwordHash, isActive: true } }),
    db.adminPasswordReset.update({ where: { id: pending.id }, data: { usedAt: new Date() } }),
  ]);
  await audit({ adminId: admin.id, action: "USER_CREATE", entity: "AdminUser", entityId: admin.id, metadata: { setup: "bootstrap" }, ip: await clientIp() });
  return { ok: true };
}
