import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getLatestSubmission } from "@/lib/id-storage";
import { isAdult } from "@/lib/age";
import { VERIFIED_MEANING } from "@/lib/kyc-copy";
import { VerificationCard } from "@/components/verification-card";
import { RefreshStatus } from "@/components/refresh-status";
import { UploadForm, DiscardUploadForm } from "./upload-form";

async function Content() {
  await connection();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const latest = await getLatestSubmission(profile.id);
  return (
    <>
      <h1 className="text-3xl font-bold">ID verification</h1>
      <p>{VERIFIED_MEANING}</p>
      <p role="status">Status: {profile.identityStatus}</p>
      {profile.identityStatus === "verified" ? (
        <>
          <p>Your ID review is complete.</p>
          {profile.tier === "verified_guest" && (
            <Link href="/become-host" className="block text-active underline">
              Become a host
            </Link>
          )}
        </>
      ) : profile.identityStatus === "pending" ? (
        <>
          <p>Under review</p>
          {latest && !latest.uploaded_at && (
            <DiscardUploadForm id={latest.id} />
          )}
        </>
      ) : !profile.dateOfBirth || !isAdult(profile.dateOfBirth) ? (
        <p>
          An adult DOB is required. Contact the project administrator to
          complete this legacy account.
        </p>
      ) : (
        <>
          {profile.identityStatus === "failed" && (
            <p>
              Review result:{" "}
              {latest?.reject_reason ??
                "Your previous submission was not approved."}{" "}
              You may resubmit.
            </p>
          )}
          <UploadForm />
        </>
      )}
      <RefreshStatus />
      <Link href="/dashboard" className="block text-sm underline">
        Back to dashboard
      </Link>
    </>
  );
}
export default function Page() {
  return (
    <VerificationCard>
      <Suspense fallback={<p>Loading status…</p>}>
        <Content />
      </Suspense>
    </VerificationCard>
  );
}
