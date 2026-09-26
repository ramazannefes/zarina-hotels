import type { Locale } from "./i18n/config";

// ── Money formatting ──
// Canonical booking currency is GEL. Display conversion is server-side only.

export type Currency = "GEL" | "USD" | "EUR";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GEL: "₾",
  USD: "$",
  EUR: "€",
};

export function formatMoney(amount: number, currency: Currency = "GEL", locale: Locale = "en"): string {
  const intlLocale = locale === "ka" ? "ka-GE" : locale === "tr" ? "tr-TR" : "en-GB";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

// ── Dates (all hotel logic in Asia/Tbilisi, UTC-safe via date-only strings) ──

export const HOTEL_TIMEZONE = "Asia/Tbilisi";

/** Parse "YYYY-MM-DD" to a UTC-noon Date (avoids DST/timezone drift for date-only math). */
export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date-only string: ${value}`);
  }
  return new Date(`${value}T12:00:00.000Z`);
}

/** Format a Date to "YYYY-MM-DD" (UTC based, for @db.Date columns). */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseDateOnly(checkIn);
  const b = parseDateOnly(checkOut);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** All stay dates as "YYYY-MM-DD" strings: checkIn inclusive, checkOut exclusive. */
export function stayDates(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cursor = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);
  while (cursor < end) {
    out.push(toDateOnly(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function formatDateHuman(date: string | Date, locale: Locale = "en"): string {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  const intlLocale = locale === "ka" ? "ka-GE" : locale === "tr" ? "tr-TR" : "en-GB";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
