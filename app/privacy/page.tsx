import { VerificationCard } from "@/components/verification-card";
import { COLLECTION_NOTICE, VERIFIED_MEANING } from "@/lib/kyc-copy";
export default function Page() {
  return (
    <VerificationCard>
      <h1 className="text-3xl font-bold">Privacy — project placeholder</h1>
      <p>Version 2026-01. {COLLECTION_NOTICE}</p>
      <p>
        We retain your entered DOB, account details, consent and review
        outcomes, reviewer ID, timestamps and any rejection reason. We do not
        extract or store ID numbers. There is no selfie or liveness check.
      </p>
      <p>
        {VERIFIED_MEANING} Student IDs may not show a birth date; in that case
        the age check relies on the DOB you entered.
      </p>
      <p>
        Deletion failures are flagged to admins for retry. Abandoned uploads
        require deletion within 30 days. This notice and the contact address
        must be reviewed before a real launch.
      </p>
    </VerificationCard>
  );
}
