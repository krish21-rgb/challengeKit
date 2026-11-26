import { getSiteUrl } from "@/lib/auth/validation";

// A malformed project URL should be treated like missing configuration rather
// than passed to the Supabase client, which would throw during construction.
export function getSupabaseConfig() {
  const url = getSiteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}
