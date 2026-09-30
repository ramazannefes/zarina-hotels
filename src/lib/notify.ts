// Admin notification service — records important events for the panel bell.
// Never throws: notification failures must not break the main flow.

import { db } from "./db";

export type NotifyKind = "reservation" | "payment" | "operation" | "message" | "system";

export type NotifyInput = {
  kind: NotifyKind;
  title: string;
  body?: string;
  link?: string; // relative admin URL to open on click
  hotelId?: string | null;
  bookingId?: string | null;
  /** Tüm yöneticilere tek bildirim düşer (fan-out yok). */
};

/**
 * Persist an admin notification. Safe to call from any server context;
 * failures are logged but swallowed so the primary operation succeeds.
 */
export async function notifyAdmins(input: NotifyInput): Promise<void> {
  try {
    await db.adminNotification.create({
      data: {
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        hotelId: input.hotelId ?? null,
        bookingId: input.bookingId ?? null,
      },
    });
  } catch (err) {
    console.error("[notify] bildirim kaydedilemedi:", err);
  }
}
