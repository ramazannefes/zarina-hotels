# Production Deployment Guide — Zarina Hotels

## 1. Prerequisites (owner actions)

- [ ] Domain (e.g. zarinahotels.com) + DNS access
- [ ] Managed PostgreSQL (Neon, Supabase, or RDS)
- [ ] BOG **or** TBC internet-acquiring merchant account (GEL settlement)
- [ ] Resend account (or SMTP) with verified sending domain
- [ ] Official hotel media assets

## 2. Environment

Copy `.env.example` to `.env` (never commit it) and set:

| Variable | Notes |
|---|---|
| `DATABASE_PROVIDER` | `postgresql` in production |
| `DATABASE_URL` | Managed Postgres connection string (use pooled URL for serverless) |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |
| `PAYMENT_PROVIDER` | `BOG` or `TBC` (never `MOCK` in production — code rejects it) |
| `BOG_CLIENT_ID` / `BOG_CLIENT_SECRET` | From internet-acquiring onboarding |
| `EMAIL_PROVIDER` | `RESEND` or `SMTP` |
| `EMAIL_FROM` | `Zarina Hotels <bookings@zarinahotels.com>` (verified domain) |
| `SESSION_SECRET` | 64+ random chars (`openssl rand -hex 32`) |
| `CRON_SECRET` | Random string for cron-protected endpoints |
| `ADMIN_BOOTSTRAP_EMAIL` | Owner's email for first admin |

## 3. Database

```bash
# Apply the PostgreSQL schema (zero-downtime migrations):
npx prisma migrate deploy --schema prisma/schema.production.prisma
# or for first deploy:
npx prisma db push --schema prisma/schema.production.prisma

# Create the first admin (no default password ever exists):
npm run admin:create   # prints a one-time /admin/setup?token=... link (24h validity)
```

Backups: enable automated daily backups + PITR on the managed DB (Neon/RDS built-in). Test restores quarterly.

## 4. Payment webhooks

- BOG/TBC dashboard: set webhook URL to `https://yourdomain.com/api/payments/webhook`
- The endpoint verifies the provider signature before any state change; duplicate events are idempotent.
- Implement the concrete `BogPaymentProvider`/`TbcPaymentProvider` in `src/lib/payments/` following the `MockPaymentProvider` shape (createIntent / verifyWebhook / refund / getStatus) — the booking engine needs no changes.

## 5. Deploy (Vercel)

1. Import repo, set all env vars (Production scope).
2. Build command: `npm run build` (runs `prisma generate && next build`).
3. Point domain, enable HTTPS (automatic), HSTS is set via `next.config.ts`.
4. Recommended cron (Vercel Cron or external):
   - `*/5 * * * *` → expire stale holds (call a `CRON_SECRET`-protected route)
   - `0 3 * * *` → currency rate refresh
   - `0 8 * * *` → upcoming-stay reminder emails

## 6. Monitoring & operations

- Structured error logging (wire Sentry or Axiom; `internal` errors never reach clients)
- Uptime monitor on `/` and `/api/availability` (synthetic booking check weekly)
- DB alerts: connection saturation, replica lag, disk
- Review `/admin/audit` weekly; alert on `LOGIN_FAILED` spikes

## 7. Security checklist (pre-launch gate)

- [ ] No secrets in client bundle: audit with `npm run build && grep -r "SECRET\|CLIENT_SECRET" .next/static || true`
- [ ] `PAYMENT_PROVIDER !== "MOCK"`
- [ ] Webhook signature verification tested against provider sandbox (positive + negative)
- [ ] HTTPS enforced; HSTS preload submitted
- [ ] Rate limits reviewed (booking/contact/manage endpoints)
- [ ] Admin passwords: 12+ chars, bcrypt-12, unique accounts per staff member
- [ ] `robots.txt` blocks `/admin`, `/api`, `/payment`
- [ ] Cookie consent banner active before enabling analytics IDs
- [ ] Final legal texts published via Admin → Content (replaces NEEDS ADMIN VERIFICATION placeholders)

## 8. Data that must be verified before go-live

All records carry `isDemo` / `needsVerification` flags. In Admin:
- Hotel contact details, coordinates, Maps embed
- Room inventory counts & real rates (replace demo ₾ values)
- Official media (replace placeholder URLs)
- Policies (Privacy, Terms, Cookies, Booking, Cancellation)
- Reviews (only verified, with provenance)
