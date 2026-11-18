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

## Manual ID review MVP

This school-project implementation is in `party-rentals-api` only. It uses Supabase email OTP, private Storage, and manual admin review of a government or student ID. It has no selfie/liveness check, third-party KYC provider, Stripe dependency, or paid service requirement.

Journey: consent notice → `/sign-up` (`/signup` alias) → `/verify-email` → `/dashboard` (basic) → `/verify-identity` (ID upload) → `/admin/verifications` (review) → verified guest → `/become-host` (agreement) → verified host.

| Tier | Requirements | Access |
| --- | --- | --- |
| `basic` | Email confirmed and an adult DOB supplied at signup | Browse events |
| `verified_guest` | Admin approved a government or student ID | Reserve/RSVP and message hosts |
| `verified_host` | Guest verification plus host agreement | Create/publish events |

Verified means a government or student ID was reviewed and age confirmed by our team. The dashboard links to ID status, host onboarding and (for admins) the review queue. Existing event/reservation APIs persist data; the absent web RSVP/message/create forms have gated TODO server-action stubs that return an unimplemented message. Payout onboarding is skipped.

### Environment and migration setup

Copy `.env.example` to your local `.env` and provide:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; never prefix it with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`, or put it in Expo code.
- `NEXT_PUBLIC_SITE_URL`, e.g. `http://localhost:3000` for the demo.
- The existing trusted `DATABASE_URL` for Drizzle.

The read-only preflight against the configured database found **zero orphan profiles**. The first migration also checks this at apply time and aborts if any are found. It never deletes orphan rows. If it aborts, report/reconcile those profiles before retrying:

```sql
select p.id from public.profiles p
left join auth.users u on u.id = p.id where u.id is null;
```

Apply these files in order through the Supabase SQL editor or your established migration workflow, after the existing application tables are present:

1. `supabase/migrations/20261118010000_manual_kyc.sql`
2. `supabase/migrations/20261118010100_manual_kyc_upload_review.sql`
3. `supabase/migrations/20261118010200_manual_kyc_tier_caps.sql`
4. `supabase/migrations/20261118010300_manual_kyc_retention.sql`

The configured Supabase database was inspected read-only; these migrations have been exercised in a disposable local PostgreSQL cluster and **have not been applied to your hosted database**. Do not run `drizzle-kit push` over them: SQL is authoritative for Auth foreign keys, policies, functions and triggers. Profile/contact/role columns are preserved. Existing accounts keep NULL DOB/consent evidence instead of invented values; use fresh demo accounts or a trusted admin migration to complete legacy onboarding. `role` and `is_admin` are separate; an existing `role = 'admin'` does not automatically grant review access.

Authenticated browser clients can SELECT only their own profiles, consents and submissions. Their write privileges are revoked and no write policies are added. Tier/is_admin/status cannot be self-edited. Tier-cap policies are restrictive, including anonymous access, so permissive legacy write policies cannot bypass them. Trusted Drizzle routes also enforce tiers because they bypass RLS.

The migrations create **private** bucket `id-submissions`, with a 5 MiB limit and JPEG/PNG/WebP MIME types. Never make it public or add browser access policies. A restrictive bucket guard blocks browser operations even if another Storage policy is overly broad. Every object path is generated as `{authenticated_user_id}/{submission_uuid}.{detected_ext}`. Upload filenames are ignored and are not logged. All Storage operations use the service role. See [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

### Supabase Auth dashboard

1. Enable **Confirm email** under Authentication → Sign In / Providers → Email. Set password minimum **8**, email OTP length **6**, expiry **600 seconds**, and resend interval at least **60 seconds**. The signup action signs out and reports a configuration error if Supabase returns an auto-confirmed session.
2. Edit Authentication → Email Templates → **Confirm signup** to show `{{ .Token }}` instead of `{{ .ConfirmationURL }}`, for example:

   ```html
   <h2>Confirm your Party Link email</h2>
   <p>Your verification code is: {{ .Token }}</p>
   <p>Enter this code on Party Link's verification page.</p>
   ```

3. Set the Supabase Site URL to your demo origin. Configure custom SMTP using **Brevo's free tier**, a verified sender/domain, and the SMTP credentials shown in your Brevo account. The built-in Supabase sender is heavily rate limited. Follow [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp); no SMTP secrets belong in browser code.
4. Keep Supabase's Auth rate limits enabled. The 60-second resend countdown is a client convenience; Supabase enforces real limits even if someone refreshes the page or calls an action directly.

Terms, privacy and data-collection acceptance are captured with version `2026-01` at signup and written to `consents` only after confirmation. Retries preserve original timestamps. If consent logging fails after verification, reload `/verify-email?email=…`; its authenticated page-load recovery retries the write. Login with an unconfirmed email resends and opens that screen. Updating Auth metadata later cannot replace the original signup consent version stored in the protected profile.

### Make an admin and review IDs

Create and confirm a normal account first. In the **Supabase SQL editor**, look up the intended account and grant its profile review permission manually:

```sql
select id, email from auth.users where email = 'replace-with-admin@example.com';
update public.profiles set is_admin = true
where id = 'REPLACE-WITH-CONFIRMED-USER-UUID'::uuid;
-- Revoke later with: update public.profiles set is_admin = false where id = ...;
```

There is no admin-enrollment UI or API. Every admin page load, decision and cleanup action validates the session with `auth.getUser()` and reads `is_admin` through the service role. The proxy redirects confirmed non-admins to the dashboard before streaming; the page/action guard independently returns not-found for unauthorized access. The SQL review function independently rechecks the flag.

At `/verify-identity`, choose Government ID or Student ID and upload the front (JPEG/PNG/WebP, up to 5 MiB). Content signatures/container headers determine the extension and MIME type, not the filename or browser MIME claim. The notice allows users to cover ID numbers. The database reserves one pending slot before upload; only an upload marked ready can be reviewed. Failed uploads are compensated. If compensation fails or a response is uncertain, the tracked reservation remains visible for cleanup rather than becoming an untracked file. An interrupted upload can be discarded after ten minutes; a cleanup claim prevents late finalization from racing that discard.

At `/admin/verifications`, pending submissions appear oldest first (batches of 50) with the account name, entered DOB and ID type. The server generates a [signed image URL](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) lasting **60 seconds** only after admin authorization. Refresh when it expires. Images bypass Next image optimization so it does not retain additional copies. Do not download, copy, forward or screenshot the IDs.

Before approving, compare the name/photo and any DOB shown with the account information. If a displayed DOB contradicts the account or age requirement, reject (use Other if no more specific listed reason applies). A student ID without DOB relies on the entered DOB. Reject reasons are fixed: Blurry/unreadable; Name does not match account; Invalid or edited ID; Appears under 18; Other.

Decisions and profile updates are atomic. Conditional pending-only updates make repeated decisions no-ops and never downgrade a host. Approval promotes basic to verified_guest, records reviewer/time and verified_at; rejection leaves the tier unchanged and permits resubmission. In-app status displays the outcome/reason; email outcome notification is a TODO.

After either decision the server deletes the image, then clears its path. A deletion failure is explicitly reported, retains a tracked path and appears in the admin **Image deletion needs attention** queue with a retry button. Clearing the DB path is also retried if it fails after Storage deletion. IDs cannot be reviewed before upload completion. Account deletion first attempts to remove tracked ID images, aborting if deletion fails, before the Auth cascade removes tracking rows.

### Retention and limitations

Run this from a trusted server daily (e.g. a free local scheduled task), with the server env configured:

```bash
node --env-file=.env scripts/purge-id-submissions.mjs
```

It expires pending submissions older than 30 days, deletes their files, retries reviewed-file deletion failures, and scans generated bucket paths for unreferenced images older than 30 days (including Auth deletion cascades). Failed cleanup keeps a retry path and sets a nonzero exit code; logs contain counts only. Each tracked-data batch is capped at 100; repeat until both batch counts are below 100 for a backlog. **The script is provided; scheduling it is still your responsibility.** Never delete Storage metadata directly in SQL to remove an image.

We retain account details, the entered DOB, consent records, review status/reason, reviewer ID and timestamps. We do not extract/store ID numbers, OCR contents, or selfie data. Uploaded images exist only in private Storage during review and are deleted immediately on decision, with explicit retries for service failures. `uploaded_at` and `cleanup_started_at` are operational timestamps, not additional identity data. Replace `privacy@example.invalid` with a real deletion contact and review the terms/privacy placeholders before using the project with real users.

Known MVP limitations: there is **no liveness check**, so an uploaded ID may belong to someone else. **Student IDs may omit DOB**, so age may rely on the entered DOB. Human review is not proof that the uploader owns the document. A real launch needs an automated provider, legal review of terms/consent, and a data-retention policy under the Philippine Data Privacy Act.

The Expo app is deliberately unchanged. Its signup must send name, adult DOB, `accept_terms: true`, and `consent_version: '2026-01'`; older signup clients without these fields are rejected by the Auth trigger. Expo must handle API JSON `401`/`403` plus `redirectTo` (`/login` or `/verify-identity`) to offer onboarding. Those APIs return JSON rather than HTML redirects.

### Verification

```bash
npm run typecheck
npm run lint
npm run test:kyc
npm run build
npm run test:kyc:http
```

On Windows with PostgreSQL CLI tools on PATH:

```powershell
powershell -NoProfile -File scripts/test-kyc-db.ps1
```

This starts a disposable loopback-only cluster, applies all migrations to a schema/Storage fixture, runs role/RLS/transaction checks, then stops and removes that cluster. It never uses `DATABASE_URL`. `lint` checks the changed KYC/auth sources with temporary pinned Biome tooling via `npm exec`, treating warnings as failures; no application dependency is added. Unrelated legacy lint findings are outside its scope. If Node reports a local certificate-chain error, use `NODE_OPTIONS=--use-system-ca` in that terminal instead of disabling TLS checks.

| Acceptance item | Automated verification | Manual integration |
| --- | --- | --- |
| Missing consent and under-18 signup rejected | Zod/actions; direct Auth trigger in PostgreSQL | Submit via the configured form |
| OTP redirects, wrong code, consent logging, resend | Actual actions with mocked Auth service; production OTP HTML | Real email delivery, correct emailed code, browser countdown |
| Basic RSVP/message/create denied | Web guards, API JSON gate tests, real restrictive RLS | Expo onboarding navigation |
| Browser cannot change tier/admin/status or read private images | Real roles/grants/RLS, including legacy permissive policies | Optional hosted browser-client check |
| Content/size checks and one pending submission | Action/content tests, real unique index and upload RPCs | Real private Storage upload |
| Admin-only review and 60-second signing | Service-flag/URL/action tests; SQL admin recheck | Review with a configured admin |
| Approve/reject, deletion retries, resubmit, duplicate decision | Actual helpers/actions with mocked Storage; real atomic review RPCs | Storage deletion under configured credentials |
| Host agreement promotion and idempotency | Action test; real rollback and replay tests | Accept agreement in browser |

The production build reports a security advisory for the repository's installed Next.js version. Upgrade is recommended; dependency upgrades were outside this task's constraint.

Validation completed: **18 action/service-boundary tests**, all **isolated PostgreSQL migration/RLS/transaction checks**, **TypeScript**, **KYC-scoped lint (50 files, zero warnings)**, the **production build**, and **HTTP smoke checks** passed. HTTP checks cover signup/OTP markup, eight protected-route redirects (including admin review), and two unauthenticated mutation API denials. Auth email delivery, browser countdown interaction and real hosted Storage uploads/deletions remain manual integration checks after dashboard setup.
