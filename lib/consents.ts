import "server-only";
import { createAdminClient } from "@/lib/admin";

export const LEGAL_VERSION = "2026-01";
export const HOST_AGREEMENT_VERSION = "2026-01";

// Only call after getUser/verifyOtp confirms the authenticated account's email.
// ignoreDuplicates preserves the first accepted_at on retries and later logins.
export async function recordSignupConsents(userId: string) {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("signup_consent_version")
    .eq("id", userId)
    .single();
  if (error || !profile) throw new Error("Could not read signup consent.");
  // Legacy accounts have no evidence of accepting this agreement.
  if (!profile.signup_consent_version) return;
  const { error: writeError } = await admin.from("consents").upsert(
    ["terms", "privacy"].map((document) => ({
      user_id: userId,
      document,
      version: profile.signup_consent_version,
    })),
    { onConflict: "user_id,document,version", ignoreDuplicates: true },
  );
  if (writeError) throw new Error("Could not record signup consent.");
}
