import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/admin";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Supabase public credentials are not configured.");
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }
  // Reject non-admin page requests before streaming starts; the page/actions
  // independently recheck authorization before reading or signing any image.
  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    const { data, error } = await createAdminClient().from("profiles").select("is_admin").eq("id",user.id).single();
    if (error || data?.is_admin !== true) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/dashboard";
      destination.search = "";
      const denied = NextResponse.redirect(destination);
      response.cookies.getAll().forEach(cookie => { denied.cookies.set(cookie); });
      return denied;
    }
  }
  return response;
}
