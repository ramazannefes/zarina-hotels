// Audit logging — record important admin/system actions.
// NEVER log passwords, tokens, card data or payment secrets.

import { db } from "./db";
import type { AuditAction } from "@prisma/client";

export type AuditInput = {
  adminId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

const FORBIDDEN_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "cardNumber",
  "cvv",
  "apiKey",
  "twoFactorSecret",
]);

function sanitize(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? (sanitize(input.metadata) as object) : undefined,
        ip: input.ip ?? null,
      },
    });
  } catch {
    // audit must never break the main flow, but failures surface in server logs
    console.error("[audit] failed to write log entry");
  }
}
