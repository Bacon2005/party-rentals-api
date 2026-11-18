import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { VERIFIED_MEANING } from "@/lib/kyc-copy";
export async function VerificationStatus() {
  const profile = await getProfile();
  if (!profile) return null;
  return (
    <div className="space-y-2 rounded-lg border border-border-color p-4 text-sm">
      <p>
        Tier: <strong>{profile.tier.replaceAll("_", " ")}</strong> · ID status:{" "}
        {profile.identityStatus}
      </p>
      <p>{VERIFIED_MEANING}</p>
      <Link
        href={
          profile.tier === "verified_guest"
            ? "/become-host"
            : "/verify-identity"
        }
        className="mr-4 text-active underline"
      >
        {profile.tier === "verified_guest"
          ? "Become a host"
          : "View ID verification"}
      </Link>
      {profile.isAdmin && (
        <Link href="/admin/verifications" className="text-active underline">
          Review IDs
        </Link>
      )}
    </div>
  );
}
