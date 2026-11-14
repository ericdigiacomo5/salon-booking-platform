# Salon Booking Platform

A mobile-first booking and front-desk system I built for a real local nail salon, where it now runs the salon's appointment book. This repository is an anonymized copy: the business is renamed "Demo Nail Salon", and its contact details, photos, legal text and infrastructure details are replaced or removed. Shared with the client's permission.

Staff run everything from an admin schedule: booking (one-off or standing weekly appointments), checkout, store credit, gift certificates, retail sales with sales tax, and artist pay reports. Customers sign in to see their bookings and credit, add visits to their calendar, and opt in to appointment texts. There's no online booking, which was the owner's decision: customers call, staff book.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL · Auth.js v5 · Resend (email) · Cloudinary (images) · Twilio (SMS) · Cloudflare Workers via OpenNext · GitHub Actions CI · installable PWA.

## The interesting problems

**Double booking is impossible at the database level.** Every appointment claims fixed 15-minute `AppointmentSlot` rows with `@@unique([artistId, slotStart])`. Two staff members booking the same time at once can't both succeed: the second insert hits the constraint, and Prisma's `P2002` becomes a clean `409`. I chose this over a Postgres exclusion constraint because the slot table is easier to reason about, test and explain, and the salon's fixed 15-minute grid makes it a natural fit. Every reschedule, length change or service change re-claims slots through one function (`reclaimSlots()` in `src/lib/booking.ts`), inside one transaction.

**Store credit is a ledger, not a number.** Credit is money the business owes, so it's an append-only `CreditEntry` table with a cached balance on the user, changed only through `addCredit()` / `spendCredit()` (`src/lib/credit.ts`) inside the caller's transaction. A debit is a conditional update (the balance must cover it), `CHECK` constraints keep balances at zero or above, and corrections are new entries, never edits. Checkout is also conditional on the appointment being unchanged since it was read, so two simultaneous checkouts can't spend the same credit. `npm run check-credit` reconciles the cache against the ledger.

**Time zones: the salon's clock, whatever the server's.** The app runs on servers in UTC and in browsers anywhere. All date logic goes through two `Intl`-based primitives in `src/lib/salon-time.ts`; a test fails if any other file touches a `Date`'s local fields or calls `toLocale*String()`; and the time zone tests run under five process time zones (UTC, New York, Los Angeles, Tokyo and UTC+14). CI runs the whole suite in UTC and again in Tokyo. This caught two real bugs before launch.

**Pay data can't leak through ordinary reads.** Commission rates and per-service fees live in their own tables, not as columns on `Artist` or `Service`, because those rows reach customers through ordinary `include` reads and public API routes. Rates are snapshotted at checkout, so changing a rate never rewrites a past pay period. The pay report's math (`src/lib/pay-report.ts`) is pure and unit-tested; discounts are spread over service lines with largest-remainder rounding, so the per-service rows always add up exactly.

**Texting with double opt-in.** SMS consent is per phone number and recorded as append-only `SmsConsentEvent` rows (proof of consent for A2P 10DLC registration). Customers opt in from their account and reply YES, or walk-ins text JOIN from a printed desk sign. STOP, START and HELP are handled, and changing the phone number turns texts off. Twilio webhooks are verified by signature before anything else runs, and every template is checked to be GSM-7 and a single segment.

**Security is enforced by tests, not by convention.** A security review found that admin pages streamed customer data to signed-out visitors: Next.js renders a page in parallel with its layout, so the layout's auth redirect didn't protect the page. Now every admin page awaits `requireAdminPage()` as its first statement and every API route checks identity inside the route, and `src/lib/route-guards.test.ts` fails the build if any page or route doesn't. Mutations reject cross-origin requests and non-JSON bodies (a `text/plain` form post can carry valid JSON, so parsing alone never stopped CSRF). Sessions have both an idle and an absolute limit, and are revoked on password change or "sign out everywhere".

**Built to run on about $20 a month.** That was the owner's limit. The site runs on Cloudflare Workers, with Neon, Resend and Cloudinary on free plans. The Worker answers the uptime check and paths the site doesn't have before Next.js starts, so bots and monitors never wake the database (`cloudflare-worker.mjs`, `known-paths.mjs`). Error reporting writes structured log lines and posts to a webhook, with no vendor SDK.

## Decisions and trade-offs

- **No payments, ever.** The salon charges on its own POS. Checkout records how a visit was paid (cash, card, Groupon, other), so the app never stores card data.
- **REST API and client `fetch()`, not Server Actions,** so a future native app can reuse the same API. Server Components read with Prisma directly.
- **Rate limiting at Cloudflare's edge,** not in the app or its database.
- **A hand-written service worker** caches only content-hashed build assets and an offline page. Pages and API responses are never cached: booking data must be live, and signed-in pages hold personal data.
- **Plain-string email templates** that escape every interpolated value, instead of a React email library (too slow to start up on Workers).
- **Soft deletes for business records** (cancelled appointments, retired services and artists); hard deletes only where nothing references the row.
- **Out of scope:** online payments, online booking (the client's call), a native app.

## Running it locally

Requirements: Node.js 24 and a PostgreSQL database.

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, AUTH_URL and NEXT_PUBLIC_APP_URL
npx prisma migrate deploy
npx prisma generate
SEED_DEV_DATA=1 npx prisma db seed   # a demo artist, services, hours and a dev admin
npm run dev
```

Open http://localhost:3000 and sign in as `admin@example.com` / `admin12345`. With no `RESEND_API_KEY` or `TWILIO_*` values set, emails and texts are printed to the console instead of being sent.

| Command                                | What it does                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm test`                             | Unit tests (Node's built-in runner), including the route-guard and time zone rules |
| `npm run lint`                         | ESLint                                                                             |
| `npx next typegen && npx tsc --noEmit` | Typecheck                                                                          |
| `npm run build`                        | Production build                                                                   |
| `npm run preview`                      | The app in Cloudflare's local runtime                                              |
| `npm run check-credit`                 | Reconcile store-credit balances against the ledger                                 |

## Layout

```
prisma/              schema, migrations (some hand-written), idempotent seed
src/app/             customer pages, /admin, and the REST API (src/app/api)
src/components/      UI, grouped by area
src/lib/             scheduling engine, booking transactions, credit ledger,
                     pay and retail math, SMS consent, salon-time helpers
cloudflare-worker.mjs  Worker entry: edge 404s, ping, cron trigger, rate limits
.github/workflows/   CI: lint, typecheck, tests in two time zones, build
```

## Licence

Shared for portfolio purposes with the client's permission. All rights reserved.
