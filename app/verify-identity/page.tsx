import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getProfile } from "@/lib/auth";
import { isAdult } from "@/lib/age";
import { VerificationCard } from "@/components/verification-card";
import { IdentityForm, RefreshIdentityStatus } from "./identity-form";

async function Content() {
  await connection();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const verified =
    profile.tier !== "basic" && profile.identityStatus === "verified";
  return (
    <>
      <h1 className="text-3xl font-bold">Confirm identity and age</h1>
      <p className="text-sm font-bold">Sandbox demo — use Stripe test data.</p>
      <p role="status">Status: {profile.identityStatus}</p>
      <p className="text-neutral-500">
        “Verified” means identity and age confirmed. Verification is required to
        RSVP or message hosts.
      </p>
      {verified ? (
        <>
          <p>Your identity and age are confirmed.</p>
          {profile.tier === "verified_guest" && (
            <Link
              href="/become-host"
              className="block rounded-lg bg-form-button px-4 py-2 text-center text-white"
            >
              Become a host
            </Link>
          )}
        </>
      ) : !profile.dateOfBirth || !isAdult(profile.dateOfBirth) ? (
        <p role="alert">
          This account needs an 18+ date of birth recorded before verification.
          Contact the project administrator.
        </p>
      ) : (
        <>
          {profile.identityStatus === "pending" && (
            <p>
              After returning from Stripe, refresh to check the result.
              Processing can take a few minutes.
            </p>
          )}
          {profile.identityStatus === "failed" && (
            <p>
              Verification did not complete or the ID date of birth did not
              match your signup details. You can retry.
            </p>
          )}
          <IdentityForm status={profile.identityStatus} />
        </>
      )}
      <RefreshIdentityStatus />
      <Link href="/dashboard" className="block text-sm underline">
        Back to dashboard
      </Link>
    </>
  );
}

export default function Page() {
  return (
    <VerificationCard>
      <Suspense fallback={<p>Loading verification…</p>}>
        <Content />
      </Suspense>
    </VerificationCard>
  );
}
