import "server-only";
import { createClient } from "@supabase/supabase-js";

// Creates a Supabase client that uses the service role secret instead of the logged-in user session.
// This bypasses Row Level Security (RLS), so it should only be used on the server in trusted
// code paths after a user has already been verified.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
