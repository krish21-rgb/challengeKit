import { getSiteUrl } from "@/lib/auth/validation";

// Use an explicitly configured origin, never a request's Host header.
export function getJoinUrl(siteUrl: string | undefined): string | null {
  const origin = getSiteUrl(siteUrl);
  return origin ? new URL("/join", origin).toString() : null;
}
