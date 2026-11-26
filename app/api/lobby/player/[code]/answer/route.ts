import { cookies } from "next/headers";
import { createLobbyAdmin, guestCookieName, json, tokenHash, validGuestToken } from "@/lib/lobby/server";
import { validAnswer, validPin } from "@/lib/lobby/model";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Invalid request." }, 415);
  if (Number(request.headers.get("content-length") || "0") > 4096) return json({ error: "Invalid request." }, 413);
  const { code } = await params;
  if (!validPin(code)) return json({ error: "Invalid game." }, 400);
  const token = (await cookies()).get(guestCookieName(code))?.value;
  if (!validGuestToken(token)) return json({ error: "Join this game first." }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (!validAnswer(body)) return json({ error: "Choose a valid answer." }, 400);
  const admin = createLobbyAdmin(); if (!admin) return json({ error: "Game service is not configured." }, 503);
  const { data, error } = await admin.rpc("submit_guest_answer", { p_pin: code, p_token_hash: tokenHash(token), p_question_index: body.questionIndex, p_option_index: body.optionIndex });
  if (error || !data) return json({ error: "Couldn’t submit your answer. Please try again." }, 503);
  const messages: Record<string, string> = { closed: "This question is closed or has changed.", already_answered: "Your answer is already submitted.", unavailable: "This game is no longer available.", invalid: "Choose a valid answer." };
  if (!data.ok) return json({ error: messages[data.error] || "Couldn’t submit your answer." }, 409);
  return json({ ok: true });
}
