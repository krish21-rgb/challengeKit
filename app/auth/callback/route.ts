import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/auth/validation";

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  // Use the configured origin for redirects rather than trusting Host headers.
  if (!siteUrl) return new NextResponse("Authentication is not configured.", { status: 503 });
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", siteUrl));
  }
  return NextResponse.redirect(new URL("/login?reason=confirmation", siteUrl));
}
