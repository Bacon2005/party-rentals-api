// Compare calendar dates in UTC, including leap days and the exact 18th birthday.
export function isAdult(dateOfBirth: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth) {
    return false;
  }
  const cutoff = `${today.getUTCFullYear() - 18}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return dateOfBirth <= cutoff;
}
