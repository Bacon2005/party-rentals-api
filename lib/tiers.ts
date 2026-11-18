export type VerificationTier = "basic" | "verified_guest" | "verified_host";
export type RequiredTier = Exclude<VerificationTier, "basic">;

const rank: Record<VerificationTier, number> = { basic: 0, verified_guest: 1, verified_host: 2 };

export function hasMinimumTier(tier: string, minimum: RequiredTier): boolean {
  return Object.hasOwn(rank, tier) && rank[tier as VerificationTier] >= rank[minimum];
}
