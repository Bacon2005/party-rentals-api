import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// API routes authenticate cookies/Bearer tokens themselves. In particular, the
// signed Stripe webhook must be reachable without a browser session.
export const config = {
  matcher: [
    "/dashboard/:path*", "/events/:path*", "/bookings/:path*",
    "/analytics/:path*", "/settings/:path*", "/customers/:path*",
    "/verify-identity/:path*", "/become-host/:path*",
  ],
};
