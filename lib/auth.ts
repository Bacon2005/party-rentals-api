import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { hasMinimumTier, type RequiredTier } from "@/lib/tiers";
import { isAdult } from "@/lib/age";

export type Profile = typeof profiles.$inferSelect;

export async function getProfile(request?: Request): Promise<Profile | null> {
  const token = request?.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email_confirmed_at) return null;
  // The auth.users trigger owns profile creation. Never recreate a profile from
  // mutable user_metadata during authorization.
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));
  return profile ?? null;
}

export const verifyUser = cache(async () => {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
});

function meetsTier(profile: Profile, min: RequiredTier) {
  return (
    !!profile.dateOfBirth &&
    isAdult(profile.dateOfBirth) &&
    hasMinimumTier(profile.tier, min)
  );
}

export async function requireTier(min: RequiredTier): Promise<Profile> {
  // getProfile uses auth.getUser(), including server-side token validation.
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!meetsTier(profile, min)) redirect("/verify-identity");
  return profile;
}

// Existing Expo clients consume JSON, so API gates return a navigable 403 rather
// than following an HTML redirect. Server actions use requireTier above.
export async function requireApiTier(request: Request, min: RequiredTier) {
  const user = await getProfile(request);
  if (!user)
    return {
      response: NextResponse.json(
        { error: "Unauthorized", redirectTo: "/login" },
        { status: 401 },
      ),
    };
  if (!meetsTier(user, min))
    return {
      response: NextResponse.json(
        {
          error:
            min === "verified_host"
              ? "Host verification is required."
              : "Identity and age verification is required.",
          redirectTo: "/verify-identity",
        },
        { status: 403 },
      ),
    };
  return { user };
}
