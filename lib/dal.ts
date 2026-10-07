import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { profiles } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
export type Profile = typeof profiles.$inferSelect;

// This checks whether the logged-in user is an admin before allowing access to /admin.
// If not, they are sent back to /login.
export async function getProfile(request?: Request): Promise<Profile | null> {
  const token = request?.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient();
  const { data } = await supabase.auth
    .getClaims(token)
    .catch(() => ({ data: null }));
  if (!data) return null;
  const { sub: id, email = "" } = data.claims;
  await db.insert(profiles).values({ id, email }).onConflictDoNothing();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  return profile;
}

export const verifyUser = cache(async () => {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
});
