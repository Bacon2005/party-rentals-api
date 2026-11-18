This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Party Link: tiered KYC school demo

This implementation lives in `party-rentals-api` (Next.js 16 App Router). The sibling `party-rentals-app` is an Expo client. Existing profile/contact fields and Drizzle APIs are preserved. `/signup` aliases the existing `/sign-up`. Next.js 16 uses `proxy.ts` for middleware.

| Tier | Requirements | Access |
| --- | --- | --- |
| `basic` | Email confirmed; adult DOB supplied at signup | Browse events |
| `verified_guest` | Stripe document and selfie checks; matching adult DOB | Reserve tickets/RSVP and message hosts |
| `verified_host` | Verified guest; host agreement accepted | Create/publish events |

“Verified” means identity and age confirmed. The dashboard shows the current tier and links to verification/host onboarding. Payout onboarding is skipped. Web RSVP, messaging and party-creation server actions are explicitly marked TODO stubs; they enforce tiers and return an unimplemented message. Existing `/api/reservations` and `/api/events` persist reservations/events and now enforce the same tiers. API denials are JSON `401`/`403` with a `redirectTo` URL so existing mobile callers do not receive HTML. The Expo client must handle that URL to offer onboarding; its screens have not been rewritten.

### Environment and database

Copy `.env.example` to your local `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the existing trusted `DATABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`: server only. Used for consent and verification writes, never a browser or Expo client.
- `STRIPE_SECRET_KEY`: a **test** secret key (`sk_test_…`) for creating/retrieving Identity sessions and verifying webhook signatures.
- `STRIPE_IDENTITY_RESTRICTED_KEY`: a **test** restricted key (`rk_test_…`) with **Identity Verification Results: Read** and **Recent Detailed Verification Results: Read**. Stripe requires a restricted key and an explicit `verified_outputs.dob` expansion to read DOB. No Files permission is needed. See [Stripe's results-access guide](https://docs.stripe.com/identity/access-verification-results).
- `STRIPE_WEBHOOK_SECRET`: the `whsec_…` value for this webhook endpoint. The CLI's secret differs from the Dashboard endpoint's secret.
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` locally, or your HTTPS site origin. Used to build Stripe's return URL; never taken from form input.

Never prefix server secrets with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. Live Stripe keys/events are rejected. Only `stripe` was added to project dependencies; Zod and the server-only boundary already existed.

Apply these SQL migrations **in order**, using the Supabase SQL editor or your migration workflow, after the existing project tables (`profiles`, `event`, `reservation`, `reservation_item`) exist:

1. `supabase/migrations/202611180001_kyc.sql`
2. `supabase/migrations/202611180002_kyc_event_gates.sql`
3. `supabase/migrations/202611180003_host_agreement.sql`

The first migration preserves profile contact/role fields, adds an `auth.users` cascade foreign key, removes existing profile/consent policies, revokes browser write privileges, and grants only SELECT-own access to authenticated users. The signup trigger checks DOB/consent metadata even for direct Auth API calls. Agreement versions are fixed at `2026-01`; `signup_consent_version` records the original acceptance independently of mutable auth metadata. Terms/privacy consent rows are inserted only after email confirmation, with retries preserving their original acceptance timestamps.

Event/reservation policies are restrictive tier caps, which cannot be bypassed by an existing permissive policy. They do not introduce permissive direct-write policies: the APIs validate price, ownership and capacity. Drizzle uses a trusted database connection and bypasses RLS, so its mutation routes also enforce tiers explicitly. Do not run `drizzle-kit push` over these migrations: the SQL is authoritative for Auth foreign keys, policies, functions and triggers.

Before migration, check that existing profile IDs belong to `auth.users`; orphan rows must be repaired deliberately before the new FK can be installed. Legacy accounts retain their existing data, with NULL DOB/consent version rather than invented age or agreement records. They cannot pass tier gates. For this school demo, use a new test account via the updated signup form. A trusted migration/admin process is needed if historical accounts must be retained with completed onboarding. Older clients (including the unchanged Expo signup) that omit DOB and consent metadata will be rejected by the trigger; update those signup flows before using them against this database. Keep other auth-user creation triggers under review if you previously configured your own.

### Supabase dashboard: email OTP

1. In Authentication → Sign In / Providers → Email, enable **Confirm email**. Set minimum password length to **8**, email OTP length to **6**, expiry to **600 seconds** (about ten minutes), and the resend interval to at least **60 seconds**. Confirm email is required; the web signup action rejects an auto-confirmed session as a configuration error.
2. In Authentication → Email Templates → **Confirm signup**, replace the confirmation-link content (`{{ .ConfirmationURL }}`) with a code, for example:

   ```html
   <h2>Confirm your Party Link email</h2>
   <p>Your verification code is: {{ .Token }}</p>
   <p>Enter this code on the Party Link verification page.</p>
   ```

3. Configure **custom SMTP** using the **Brevo free tier**. Verify your sender/domain with Brevo and copy its SMTP host, port, login and SMTP key into Supabase's SMTP settings. Follow [Supabase's SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp) and the credentials shown in your Brevo account. The built-in Supabase sender is heavily rate limited and unsuitable for testing multiple accounts. Do not put SMTP credentials in browser code.
4. Set Supabase's Site URL to your local/demo site. Keep server-side Auth email rate limits enabled; the UI's 60-second cooldown is only a convenience, not a security boundary. Refreshing the page cannot bypass Supabase's limits.

The journey is `/sign-up` → `/verify-email?email=…` → `/dashboard`. Wrong/expired codes return “Invalid or expired code”. A successful OTP creates the session and logs terms/privacy consent. If the consent write fails after confirmation, reloading the verification page retries it. Logging in with an unconfirmed account resends confirmation and opens the same OTP screen.

### Stripe Identity sandbox and local testing

Enable Identity in a Stripe **sandbox/test** account. Configure both test keys above. Start the app and the Stripe CLI in separate terminals:

```bash
npm run dev
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/identity
```

Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET` and restart Next.js. For a Dashboard webhook, subscribe to `identity.verification_session.verified`, `identity.verification_session.requires_input`, and `identity.verification_session.canceled`, with the deployed HTTPS endpoint `/api/webhooks/identity`.

Sign up with test data and confirm the email. Open `/verify-identity`, acknowledge the ID/selfie processing notice, and choose “Verify my identity”. The hosted test flow requests a document, matching selfie and live capture. Use Stripe's test controls/data; do not submit real ID images. For success, the test verification's DOB must exactly match the DOB entered at signup and indicate age 18+. Use a different adult signup DOB to exercise the mismatch case. A generic CLI-generated event without a matching session reference and `metadata.user_id` cannot promote a user; complete an app-created session instead. See [Stripe's session lifecycle](https://docs.stripe.com/identity/verification-sessions).

The return URL only displays status. Use “Refresh status” while the webhook finishes; the redirect does not grant a tier. The webhook verifies the raw-body signature, retrieves the current session, checks matching metadata, document/selfie checks, DOB equality and age, then conditionally promotes `basic` to `verified_guest`. Mismatches fail without a tier change. Duplicate/out-of-order deliveries do not overwrite completed success, downgrade a host, or replace a newer session. Transient service errors return `500` for Stripe retries. After a verification failure, retry from the screen. Visit `/become-host` to accept the host agreement; the service-only RPC records consent and promotes the tier in one transaction.

Only the status, Stripe session reference and verification timestamp are persisted in addition to the entered DOB/account/consent data. Expanded results stay in memory. ID images, selfies, document numbers, extracted DOB copies and raw webhook payloads are neither stored nor logged. Stripe holds the verification material under its own lifecycle; account deletion here does not automatically redact Stripe sessions. **This is sandbox mode. A real launch needs live-mode implementation/keys, legal review of terms and biometric/privacy notices, and an explicit data retention/redaction policy.**

### Checks and acceptance results

```bash
npm run typecheck
npm run lint
npm run test:kyc
npm run build
npm run test:kyc:http
```

`lint` uses temporary, pinned Biome tooling through `npm exec`; it adds no project dependency and checks the KYC/auth files listed in `scripts/lint-kyc.mjs`, treating warnings as failures. The initial repository had no linter; unrelated legacy dashboard lint findings are outside this check. If Node cannot verify your local certificate chain on Windows, run these commands with `NODE_OPTIONS=--use-system-ca` in that terminal, without disabling TLS validation.

For real PostgreSQL policy/transaction checks on Windows (PostgreSQL CLI tools on PATH):

```powershell
powershell -NoProfile -File scripts/test-kyc-db.ps1
# Optional: -PostgresBin 'C:\Program Files\PostgreSQL\18\bin' -Port 55439
```

This creates a disposable loopback-only cluster, applies all three migrations to a schema fixture, tests RLS and transactional promotion, stops the cluster and cleans its files on success. It never connects to `DATABASE_URL` or Supabase. Do not run the test SQL manually against your application database.

| Acceptance item | Automated coverage | Manual integration still needed |
| --- | --- | --- |
| Under-18 signup rejected | Zod/action tests and real signup trigger | Submit through the configured signup screen |
| Signup → OTP; wrong code rejected; correct code → session/dashboard | Actual actions with mocked Supabase boundary | Receive a real email and confirm it |
| Resend and 60-second cooldown | Resend action validated; client cooldown implemented | Observe countdown and delivery in browser |
| Basic RSVP/message/create gating | Actual action guards; API gate; restrictive SQL policies | Follow onboarding URL in an API/mobile client |
| Browser cannot update own tier | Real PostgreSQL grants/RLS, including legacy-policy removal | Optional check using Supabase browser client |
| Stripe success promotes guest only through webhook | Real signature verification; mocked Stripe retrieval/storage | Complete an app-created Stripe test session |
| Mismatched/missing/minor DOB fails with no tier change | Actual webhook tests | Complete the mismatch test session |
| Host acceptance logs consent and promotes tier | Action validation; real atomic/idempotent service-only SQL RPC | Accept agreement in the configured app |

Validation completed: all **15 action/webhook/session tests**, **PostgreSQL migration/RLS/transaction checks**, **TypeScript**, **KYC-scoped lint (42 files, zero warnings)**, **production build**, and **production HTTP smoke checks** passed. The build reported an advisory for the repository's existing Next.js version; upgrading Next.js was outside the requested dependency changes.

The unit suite also checks exact birthdays/leap days, consent retry semantics, live-mode rejection, duplicate/stale/out-of-order webhooks and preservation of host tier. PostgreSQL tests confirm auth deletion cascades and deny anonymous writes even with legacy public policies. The HTTP check starts/stops a local production server and verifies signup/OTP HTML, seven protected-route redirects, two unauthenticated API denials and unsigned-webhook rejection. It does not submit account or identity data. Hosted SMTP delivery, Stripe's hosted capture UI and the browser cooldown require your dashboard configuration; the local browser automation helper was unavailable in this environment.
