import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { looksLikeServerKey } from "@/lib/lobby/secret";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createLobbyAdmin() {
  const config = getSupabaseConfig();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!config || !key || !looksLikeServerKey(key)) return null;
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export function guestCookieName(pin: string) { return `ck_guest_${pin}`; }
export function guestToken(value?: string) { return value && /^[0-9a-f]{64}$/.test(value) ? value : randomBytes(32).toString("hex"); }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function validGuestToken(value: string | undefined): value is string { return !!value && /^[0-9a-f]{64}$/.test(value); }
export function joinRateKey(request: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) return null;
  // Vercel supplies this header and overwrites untrusted forwarded IPs. For
  // non-Vercel production deployments fail closed until a trusted proxy exists.
  const ip = process.env.VERCEL === "1" ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0].trim() : process.env.NODE_ENV !== "production" ? "127.0.0.1" : undefined;
  if (!ip || !isIP(ip)) return null;
  return createHmac("sha256", secret).update(`challengekit:lobby:${ip}`).digest("hex");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}
