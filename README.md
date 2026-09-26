# Zarina Hotels — All in Georgia

Premium direct-booking platform for Zarina Hotels (Batumi, Georgia): multilingual public site (EN/KA/TR), real booking engine with concurrency-safe inventory, PCI-compliant payment architecture, and a role-based admin portal.

## Quick start (development)

```bash
npm install
cp .env.example .env          # then edit values
npx prisma db push            # create local SQLite database
npx tsx prisma/seed.ts        # DEMO data (clearly flagged)
npm run admin:create          # prints a one-time admin setup link
npm run dev
```

- Public site: http://localhost:3001/en (also /ka, /tr)
- Admin portal: http://localhost:3001/admin (login with the password you set via the setup link)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS with design tokens (warm luxury palette, editorial type) |
| DB (dev) | SQLite via Prisma (`prisma/schema.prisma`) |
| DB (prod) | PostgreSQL via Prisma (`prisma/schema.production.prisma`) |
| Validation | Zod on every API boundary |
| Auth | Custom sessions: bcrypt cost 12, SHA-256-hashed tokens, HttpOnly/SameSite cookies, login throttling |
| Payments | Provider abstraction (MOCK implemented; BOG/TBC slots ready) |
| Email | RESEND / SMTP / MOCK abstraction + EmailLog |

## Booking engine guarantees

1. **No overbooking** — inventory holds use optimistic concurrency (read → verify capacity → conditional `updateMany` matching exact previous counters → retry ×3 → `SOLD_OUT`). Verified by a 5-way concurrent request test: exactly 1 winner.
2. **Server-side pricing** — the client never sends totals. Nightly rates, extras, promo, and taxes are recomputed from DB (`src/lib/pricing.ts`) and snapshotted onto the booking.
3. **Holds expire** — bookings are created in `HOLDING` state with `holdExpiresAt` (+15 min). Failed payments release inventory; expired holds restore it.
4. **Webhook-verified payments** — frontend redirects never confirm bookings. Only signature-verified provider webhooks (idempotent, duplicate-safe) move `Payment → PAID` and `Booking → CONFIRMED`.
5. **Audit trail** — admin logins, rate changes, content publishes, cancellations are recorded (secrets redacted).

## Multilingual

`/en`, `/ka`, `/tr` with hreflang alternates. Dictionaries in `src/lib/i18n/`. Admin-configured content carries per-locale `needsVerification` flags.

## Money

Canonical charge currency is **GEL**. Display conversion (USD/EUR) is server-side only, from cached rates. Final charged currency is always shown before payment.

## Verified research (from public sources)

- Address: Tsminda Severiani Adjareli St 11, Batumi 6000 · +995 511 24 92 92
- 73 rooms; check-in 14:00 / check-out 12:00; 24/7 front desk
- Spa, Turkish hamam (24/7), sauna, gym, restaurant, lobby bar, free valet parking, conference room, babysitting
- Airport 7.4 km; English/Turkish/Georgian/Russian/Arabic spoken
- Instagram: @zarina_hotels_group

See `docs/01-research.md`. Everything unverified is marked **NEEDS ADMIN VERIFICATION** in the UI, DB (`needsVerification`, `isDemo` flags) and admin Settings checklist.

## Owner must provide (blocked on hotel)

1. Official photo/video media (all current images are flagged placeholders)
2. Real inventory per room type & real pricing
3. Legal texts: Terms, Privacy, Cookie, Booking, Cancellation policies
4. BOG/TBC merchant account keys (payment)
5. RESEND or SMTP credentials (email) + domain verification
6. Google Maps embed URLs / place IDs
7. Verified guest reviews (with provenance)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | Strict TS check |
| `npm test` | Vitest unit tests (pricing, payments, dates) |
| `npm run db:push` / `db:seed` | Local schema push / demo data |
| `npm run admin:create` | One-time admin setup link (no default passwords) |
| `npm run db:migrate:deploy` | Production migrations (see docs/02-deployment.md) |

## Testing

- `tests/pricing.test.ts` — nightly rates, weekend, rate plans, promos, extras, tax, invalid dates
- `tests/payments.test.ts` — webhook signature acceptance/rejection, malformed payloads, refunds
- `tests/booking-logic.test.ts` — date helpers, reference format
- Manual E2E verified: search → availability → hold → payment → CONFIRMED → email log; 5-way concurrency race (1 winner, 4 SOLD_OUT); wrong-email manage-booking returns 404.
