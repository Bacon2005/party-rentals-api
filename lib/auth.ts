import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type Profile = typeof profiles.$inferSelect;

export async function getProfile(request?: Request): Promise<Profile | null> {
  const token = request?.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email_confirmed_at) return null;
  // The auth.users trigger owns profile creation. Never recreate a profile from
  // mutable user_metadata during authorization.
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  return profile ?? null;
}

export const verifyUser = cache(async () => {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
});
