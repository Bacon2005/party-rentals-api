import { spawnSync } from "node:child_process";

// This repo had no linter. Check the KYC/auth changes without rewriting legacy
// dashboard code or adding a dependency beyond Stripe to the project.
const files = [
  "app/(auth)/layout.tsx",
  "app/(auth)/login",
  "app/(auth)/sign-up",
  "app/(app)/party-actions.ts",
  "app/(app)/dashboard/page.tsx",
  "app/(app)/events/page.tsx",
  "app/(app)/dashboard/verification-status.tsx",
  "app/api/events",
  "app/api/reservations",
  "app/api/webhooks/identity",
  "app/verify-email",
  "app/verify-identity",
  "app/become-host",
  "app/signup",
  "app/terms",
  "app/privacy",
  "components/verification-card.tsx",
  "db/schema.ts",
  "lib/admin.ts",
  "lib/age.ts",
  "lib/auth.ts",
  "lib/consents.ts",
  "lib/definitions.ts",
  "lib/identity-result.ts",
  "lib/stripe.ts",
  "lib/tiers.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "tests/kyc.test.cjs",
  "tests/kyc-http.mjs",
  "scripts/lint-kyc.mjs",
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
