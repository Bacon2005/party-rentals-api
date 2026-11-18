import { VerificationCard } from "@/components/verification-card";

export default function Page() {
  return (
    <VerificationCard>
      <h1 className="text-3xl font-bold">Privacy — project placeholder</h1>
      <p>
        Version 2026-01. We store your account details, entered date of birth,
        agreement records, and verification outcome, session reference and
        timestamp.
      </p>
      <p>
        Stripe processes government ID images and selfies, including biometric
        information, to confirm identity and age. Party Link does not store
        those images, selfies or document numbers.
      </p>
      <p>
        This project uses Stripe test mode. Use test data. A reviewed privacy
        notice and a data retention policy are required before a real launch.
      </p>
    </VerificationCard>
  );
}
