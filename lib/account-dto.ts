import type { Profile } from "@/lib/auth";

// Only account details needed by the signed-in client. Tier/status remain server-owned.
export function toAccountDto(profile: Profile) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    host_name: profile.hostName,
    avatar_url: profile.avatarUrl,
    date_of_birth: profile.dateOfBirth,
    role: profile.role,
    tier: profile.tier,
    identity_status: profile.identityStatus,
    verified_at: profile.verifiedAt,
  };
}
