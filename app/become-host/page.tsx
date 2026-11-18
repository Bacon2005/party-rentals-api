import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireTier } from "@/lib/auth";
import { VerificationCard } from "@/components/verification-card";
import { HostAgreementForm } from "./host-agreement-form";

async function Content() {
  await connection();
  const profile = await requireTier("verified_guest");
  return <>
    <h1 className="text-3xl font-bold">Become a host</h1>
    <h2 className="text-xl font-bold">Host agreement — project placeholder</h2>
    <p>Hosts are independent. Party Link does not organize or supervise events.</p>
    <p>You are responsible for following local laws and requirements concerning alcohol, noise, capacity, permits, and your event activities.</p>
    <p>“Verified” means identity and age confirmed.</p>
    <p className="text-sm text-neutral-500">Payout setup is skipped for this school project. This placeholder agreement needs legal review before a real launch.</p>
    {profile.tier === "verified_host" ? <p>You have already accepted the host agreement.</p> : <HostAgreementForm />}
    <Link href="/dashboard" className="block text-sm underline">Back to dashboard</Link>
  </>;
}

export default function Page() {
  return <VerificationCard><Suspense fallback={<p>Loading host agreement…</p>}><Content /></Suspense></VerificationCard>;
}
