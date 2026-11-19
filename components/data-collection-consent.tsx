import Link from "next/link";
import { COLLECTION_NOTICE } from "@/lib/kyc-copy";

export function DataCollectionConsent() {
  return (
    <div className="space-y-3 rounded-lg border p-4 text-sm">
      <h2 className="font-bold">Before you create an account</h2>
      <p>{COLLECTION_NOTICE}</p>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="acceptTerms" required className="mt-1" />
        <span>
          I agree to this data collection notice and the{" "}
          <Link href="/terms" className="underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>{" "}
          (2026-01).
        </span>
      </label>
    </div>
  );
}
