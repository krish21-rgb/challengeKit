import { createClient } from "@/lib/supabase/server";
import { validQuizId } from "@/lib/quiz/model";
import { json } from "@/lib/lobby/server";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validQuizId(id)) return json({ error: "Lobby not found." }, 404);
  const supabase = await createClient(); if (!supabase) return json({ error: "Service unavailable." }, 503);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in to access this lobby." }, 401);
  const { data, error } = await supabase.rpc("teacher_lobby_state", { p_session_id: id });
  if (error) return json({ error: "Couldn’t load the lobby." }, 503);
  if (!data) return json({ error: "Lobby not found." }, 404);
  return json(data);
}
