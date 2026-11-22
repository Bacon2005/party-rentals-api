import { spawnSync } from "node:child_process";

// This repo had no linter. Check the KYC/auth changes without rewriting legacy
// dashboard code or adding any project dependency.
const files = [
  "app/(auth)/layout.tsx",
  "app/(auth)/login",
  "app/(auth)/sign-up",
  "app/(app)/party-actions.ts",
  "app/(app)/dashboard/page.tsx",
  "app/(app)/dashboard/summary-total.tsx",
  "app/(app)/dashboard/recent-events.tsx",
  "app/(app)/bookings/actions.ts",
  "app/(app)/events/page.tsx",
  "app/(app)/settings/actions.ts",
  "app/(app)/dashboard/verification-status.tsx",
  "app/api/events",
  "app/api/reservations",
  "app/api/profile",
  "app/api/verification",
  "app/admin/verifications",
  "app/verify-email",
  "app/verify-identity",
  "app/become-host",
  "app/signup",
  "app/terms",
  "app/privacy",
  "components/verification-card.tsx",
  "components/data-collection-consent.tsx",
  "components/refresh-status.tsx",
  "db/schema.ts",
  "lib/admin.ts",
  "lib/age.ts",
  "lib/dashboard.ts",
  "lib/auth.ts",
  "lib/consents.ts",
  "lib/definitions.ts",
  "lib/id-validation.ts",
  "lib/id-storage.ts",
  "lib/id-upload.ts",
  "lib/profile-settings.ts",
  "lib/account-dto.ts",
  "lib/admin-review.ts",
  "lib/kyc-copy.ts",
  "lib/tiers.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "tests/kyc.test.cjs",
  "tests/dashboard.test.cjs",
  "tests/kyc-http.mjs",
  "scripts/lint-kyc.mjs",
  "scripts/purge-id-submissions.mjs",
];
const command = `biome lint ${files.map((file) => `"${file}"`).join(" ")} --error-on-warnings`;
if (!process.env.npm_execpath)
  throw new Error("Run this script with npm run lint.");
const result = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath,
    "exec",
    "--yes",
    "--package=@biomejs/biome@2.6.8",
    "--call",
    command,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
