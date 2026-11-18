import { isAdult } from "@/lib/age";

type VerifiedDob = {
  year: number | null;
  month: number | null;
  day: number | null;
};

// Only the boolean leaves this function. Extracted document details are never persisted.
export function identityDobMatches(
  profileDob: string | null,
  dob: VerifiedDob | null | undefined,
  today = new Date(),
): boolean {
  if (
    !profileDob ||
    !dob ||
    dob.year === null ||
    dob.month === null ||
    dob.day === null
  )
    return false;
  if (![dob.year, dob.month, dob.day].every(Number.isInteger)) return false;
  const documentDob = `${String(dob.year).padStart(4, "0")}-${String(dob.month).padStart(2, "0")}-${String(dob.day).padStart(2, "0")}`;
  return documentDob === profileDob && isAdult(documentDob, today);
}
