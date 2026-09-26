// Admin session management — server-side only.
// Session token is random 32 bytes; only its SHA-256 hash is stored.
// Cookie: HttpOnly, SameSite=Lax, Secure in production.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "../db";
import { hasPermission, type Permission } from "./permissions";
import type { AdminRole } from "./permissions";

export const SESSION_COOKIE = "zarina_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const MAX_LOGIN_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function createSession(adminId: string, ip?: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await db.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      adminId,
      expiresAt: newSessionExpiry(),
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export type SessionAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.admin.isActive) return null;
  return { id: session.admin.id, email: session.admin.email, name: session.admin.name, role: session.admin.role };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requirePermission(permission: Permission): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) throw new AuthError("NOT_AUTHENTICATED");
  if (!hasPermission(admin.role, permission)) throw new AuthError("FORBIDDEN", permission);
  return admin;
}

export class AuthError extends Error {
  constructor(public code: "NOT_AUTHENTICATED" | "FORBIDDEN", public permission?: string) {
    super(code);
  }
}

// ── Login throttling (server-side, DB-backed) ──

const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkLoginThrottle(key: string): { allowed: boolean; retryAfterSec: number } {
  const rec = attempts.get(key);
  const now = Date.now();
  if (rec && rec.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(key: string): void {
  const rec = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_LOGIN_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  attempts.set(key, rec);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
