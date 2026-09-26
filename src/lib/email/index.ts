// Email service — provider abstraction (RESEND | SMTP | MOCK), every send is logged.

import { db } from "../db";

export type EmailTemplate =
  | "booking_confirmation"
  | "payment_confirmation"
  | "payment_failed"
  | "booking_cancelled"
  | "refund_confirmation"
  | "upcoming_stay"
  | "admin_new_booking"
  | "contact_ack";

export type SendEmailInput = {
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  bookingId?: string;
};

async function sendViaResend(input: SendEmailInput): Promise<{ providerId: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: input.to, subject: input.subject, html: input.html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { providerId: data.id ?? null };
}

async function sendViaSmtp(input: SendEmailInput): Promise<{ providerId: string | null }> {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const info = await transport.sendMail({ from: process.env.EMAIL_FROM, to: input.to, subject: input.subject, html: input.html });
  return { providerId: info.messageId ?? null };
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.EMAIL_PROVIDER ?? "MOCK";
  try {
    let providerId: string | null = null;
    if (provider === "RESEND") {
      ({ providerId } = await sendViaResend(input));
    } else if (provider === "SMTP") {
      ({ providerId } = await sendViaSmtp(input));
    } else {
      // MOCK: log only, do not deliver (development)
      console.info(`[email:mock] → ${input.to} · ${input.subject}`);
    }
    await db.emailLog.create({
      data: {
        bookingId: input.bookingId,
        toEmail: input.to,
        template: input.template,
        subject: input.subject,
        status: "SENT",
        providerId,
      },
    });
    return { ok: true };
  } catch (err) {
    await db.emailLog
      .create({
        data: {
          bookingId: input.bookingId,
          toEmail: input.to,
          template: input.template,
          subject: input.subject,
          status: "FAILED",
          error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        },
      })
      .catch(() => undefined);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
