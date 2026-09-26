# Security & Quality Audit — Zarina Hotels (pre-delivery gate, brief #63)

Answers to the 20-point final audit, with evidence in the codebase.

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Can two customers reserve the same last room? | **No.** Holds use optimistic concurrency: read row → verify capacity → conditional `updateMany` matching exact previous counters → retry ×3 → `SOLD_OUT`. Live test: 5 concurrent requests for inventory=1 → exactly 1 success, 4 × `SOLD_OUT`; counters ended at exactly +1. | `src/lib/booking.ts` (hold loop), race test transcript |
| 2 | Can price be manipulated from DevTools? | **No.** Client sends only IDs/quantities/dates. Nightly prices, rate-plan modifiers, extras, promo and totals are recomputed from DB and snapshotted. | `src/lib/pricing.ts`, `createBookingWithHold` |
| 3 | Can a non-admin reach admin APIs? | **No.** Every admin API calls `getSessionAdmin()` + `hasPermission()`; failures return 401/403. Admin pages redirect via session guard. | `src/app/api/admin/*`, `src/app/admin/*` |
| 4 | Can a Content Manager issue refunds? | **No.** Refund permission is `refunds.approve` (FINANCE, SUPER_ADMIN only); Content Manager's matrix has no booking/finance permissions. | `src/lib/auth/permissions.ts` |
| 5 | Can payment success be spoofed via redirect URL? | **No.** Redirects are cosmetic; state changes only via the webhook pipeline (`processPaymentWebhook`), which the mock-complete endpoint also routes through. | `src/lib/payments/index.ts`, `api/payments/mock/complete` |
| 6 | Are webhooks signature-verified? | **Yes** — provider abstraction returns `valid:false` on missing/invalid signature; endpoint 401s before any processing. MOCK provider implements the same contract (HMAC-style secret check) and is disabled when `PAYMENT_PROVIDER!=="MOCK"`. | `api/payments/webhook/route.ts`, `payments.test.ts` |
| 7 | Are duplicate webhooks safe? | **Yes.** `webhookEventId` dedupe outside + inside the transaction; repeated delivery returns `already_processed` without side effects. | `processPaymentWebhook` |
| 8 | Can users access another customer's booking? | **No.** Manage-booking requires reference + matching email; mismatch returns uniform 404 (no enumeration). Wrong-email live test → 404. | `api/manage-booking/route.ts` |
| 9 | Are upload endpoints secure? | Uploads are **not implemented yet** by design — media rows reference URLs. When built: MIME allow-list, size caps, auth (`media.upload`), image re-encode. | Admin checklist notes this |
| 10 | Are passwords hashed? | **Yes.** bcrypt cost 12; no default passwords exist — first admin activates via one-time 24h single-use token + forced strong password. | `src/app/admin/actions.ts`, `scripts/admin-create.ts` |
| 11 | Are secrets in client bundles? | **No.** Only `NEXT_PUBLIC_*` vars are client-exposed; all keys are server-only env. `poweredByHeader:false`; CSP restricts sources. | `next.config.ts`, `.env.example` |
| 12 | Does booking work on mobile? | **Yes.** Mobile-first layouts, sticky booking CTAs, native `<input type=date>` pickers, touch-friendly selects; checkout progress visible. | checkout/results components |
| 13 | Are legal policies editable? | **Yes.** Policies render from `ContentBlock` (Admin → Content, per locale); placeholders are explicit `NEEDS ADMIN VERIFICATION`. | `[locale]/[policy]/page.tsx`, `api/admin/content` |
| 14 | Are prices calculated server-side? | **Yes** (see #2) — plus a price snapshot (nightly rates JSON, totals) stored on the booking for historical integrity. | `Booking.nightlyRates`, `Booking.grandTotal` |
| 15 | Are dates/timezones safe? | **Yes.** All hotel math uses date-only strings parsed at UTC-noon; no DST drift; date ranges validated (past check-in, ≤30 nights). | `src/lib/money.ts` helpers + tests |
| 16 | Is inventory restored after expired checkout? | **Yes by design** — failed/cancelled payment keeps the booking in `PENDING_PAYMENT`, and hold expiry (`holdExpiresAt` + cron per deployment guide) releases `heldCount`. Payment failure path tested. | booking service + docs/02 §5 |
| 17 | Are emails sent only after valid booking state? | **Yes.** Guest/admin emails fire only on the `confirmed` action after verified payment; every send is logged (`EmailLog`). | `api/payments/mock/complete`, `lib/email` |
| 18 | Can admins trace modifications? | **Yes.** AuditLog records login/failed-login, rate changes, content publish, user creation with admin, entity, IP, sanitized metadata (secrets redacted). | `src/lib/audit.ts`, `/admin/audit` |
| 19 | Usable without heavy JS? | **Yes.** Core pages are server-rendered; forms are native; the site remains navigable with JS disabled except payment redirect/consent UI. | RSC architecture |
| 20 | Is demo data distinguished? | **Yes.** `isDemo`/`isPlaceholder`/`needsVerification` flags in DB, badges on public pages (`DEMO VERİ` / `PLACEHOLDER`), admin tables show DEMO/VERIFY chips, Settings shows the owner checklist. | seed, components, `/admin/settings` |

## Known gaps (honest list — not faked)

- **BOG/TBC concrete providers** are stubbed behind the abstraction — the owner must open a merchant account; implementation follows the `MockPaymentProvider` interface, no booking-engine changes needed.
- **Media upload pipeline** not built (no fake endpoint shipped); admin media rows are URL-based until storage is provisioned (S3-compatible).
- **Multi-instance rate limiting** uses in-memory maps; swap for Redis/Upstash when horizontally scaled.
- **Refund workflow UI** is permission-gated in the matrix but the finance UI screens are the next iteration.
- **Customer accounts** (brief #20) architecture is prepared (auth service separation) but registration UI is not built — guest checkout works fully.
