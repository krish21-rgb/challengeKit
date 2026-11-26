// Shape checks catch common configuration mistakes; Supabase still verifies
// the key itself. This module never reads or exposes environment variables.
export function looksLikeServerKey(key: string): boolean {
  if (key.startsWith("sb_secret_") && key.length > 20 && key.length <= 4000) return true;
  if (key.length > 4000) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return !!payload && typeof payload === "object" && "role" in payload && payload.role === "service_role";
  } catch { return false; }
}
