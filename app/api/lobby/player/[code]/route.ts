import { cookies } from "next/headers";
import { createLobbyAdmin, guestCookieName, json, tokenHash, validGuestToken } from "@/lib/lobby/server";
import { validPin } from "@/lib/lobby/model";

type Context = { params: Promise<{ code: string }> };
async function credentials(context: Context) {
  const { code } = await context.params;
  if (!validPin(code)) return null;
  const token = (await cookies()).get(guestCookieName(code))?.value;
  if (!validGuestToken(token)) return null;
  return { code, hash: tokenHash(token) };
}
export async function GET(_request: Request, context: Context) {
  const auth = await credentials(context); if (!auth) return json({ error: "Join this game first." }, 401);
  const admin = createLobbyAdmin(); if (!admin) return json({ error: "Lobby service is not configured." }, 503);
  const { data, error } = await admin.rpc("guest_lobby_state", { p_pin: auth.code, p_token_hash: auth.hash });
  if (error) return json({ error: "Couldn’t load the lobby." }, 503);
  if (!data) return json({ error: "This lobby is no longer available." }, 404);
  return json(data);
}
async function update(request: Request, context: Context, leave: boolean) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Invalid request." }, 415);
  const auth = await credentials(context); if (!auth) return json({ error: "Join this game first." }, 401);
  const admin = createLobbyAdmin(); if (!admin) return json({ error: "Lobby service is not configured." }, 503);
  const { data, error } = await admin.rpc("touch_guest_lobby", { p_pin: auth.code, p_token_hash: auth.hash, p_leave: leave });
  if (error) return json({ error: "Couldn’t update the lobby." }, 503);
  if (!data) return json({ error: "This lobby is no longer active." }, 404);
  if (leave) (await cookies()).delete(guestCookieName(auth.code));
  return json({ ok: true });
}
export async function POST(request: Request, context: Context) { return update(request, context, false); }
export async function DELETE(request: Request, context: Context) { return update(request, context, true); }
