import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

// Refresh the session before Server Components run. Authorization is checked
// independently in each protected page and action with getUser().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return response;

  try {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  } catch {
    // Do not expose configuration or tokens in logs. Protected pages and
    // actions still authenticate independently and never trust this proxy.
    console.error("Unable to refresh the authentication session.");
  }
  return response;
}

// The landing page is public and has no session-dependent content. New
// authenticated routes must be added here when they are implemented.
export const config = {
  matcher: ["/login/:path*", "/register/:path*", "/dashboard/:path*", "/settings/:path*", "/quizzes/:path*", "/auth/:path*"],
};
