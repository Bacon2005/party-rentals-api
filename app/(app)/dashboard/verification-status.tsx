import Link from "next/link";
import { getProfile } from "@/lib/auth";

export async function VerificationStatus() {
  const profile = await getProfile();
  if (!profile) return null;
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-color p-4 text-sm">
    <span>Verification tier: <strong>{profile.tier.replaceAll("_", " ")}</strong></span>
    <span className="text-neutral-500">“Verified” means identity and age confirmed.</span>
    <Link className="font-bold text-active underline" href={profile.tier === "verified_guest" ? "/become-host" : "/verify-identity"}>
      {profile.tier === "verified_guest" ? "Become a host" : "View verification"}
    </Link>
  </div>;
}
