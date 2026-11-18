import { VerificationCard } from "@/components/verification-card";
import { VERIFIED_MEANING } from "@/lib/kyc-copy";
export default function Page() {
  return <VerificationCard>
    <h1 className="text-3xl font-bold">Terms — project placeholder</h1>
    <p>Version 2026-01. Party Link is a school project for adults aged 18 and over. Hosts are independent and responsible for their events. Party Link does not organize or supervise events.</p>
    <p>{VERIFIED_MEANING}</p>
    <p>These placeholder terms need legal review before a real launch.</p>
  </VerificationCard>;
}
