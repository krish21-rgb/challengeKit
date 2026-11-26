import { cookies } from "next/headers";
import { createLobbyAdmin, guestCookieName, guestToken, joinRateKey, json, tokenHash } from "@/lib/lobby/server";
import { validPin, validateNickname } from "@/lib/lobby/model";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Invalid request." }, 415);
  if (Number(request.headers.get("content-length") || "0") > 4096) return json({ error: "Invalid request." }, 413);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request." }, 400);
  const { pin, nickname } = body as Record<string, unknown>;
  if (!validPin(pin)) return json({ error: "Enter a 6-digit game PIN." }, 400);
  const invalidName = validateNickname(nickname);
  if (invalidName) return json({ error: invalidName }, 400);
  const admin = createLobbyAdmin();
  const rateKey = joinRateKey(request);
  if (!admin || !rateKey) return json({ error: "Student joining is not configured yet. Please contact the host." }, 503);
  const store = await cookies();
  const token = guestToken(store.get(guestCookieName(pin))?.value);
  const { data, error } = await admin.rpc("join_guest_lobby", { p_pin: pin, p_nickname: (nickname as string).trim(), p_token_hash: tokenHash(token), p_rate_key: rateKey });
  if (error || !data) return json({ error: "Couldn’t join right now. Please try again." }, 503);
  const messages: Record<string, string> = { unavailable: "This PIN isn’t available. Check it with your teacher.", nickname: "That nickname is already taken in this lobby. Try another.", full: "This lobby is full.", rate_limit: "Too many attempts from this network. Please wait a few minutes.", invalid: "Check your PIN and nickname." };
  if (!data.ok) return json({ error: messages[data.error] || "Couldn’t join the lobby." }, data.error === "rate_limit" ? 429 : 400);
  store.set(guestCookieName(pin), token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 6 * 60 * 60 });
  return json({ ok: true });
}
