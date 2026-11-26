"use server";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { createLobbyAdmin } from "@/lib/lobby/server";
import { validQuizId } from "@/lib/quiz/model";
export async function createLobby(quizId: string): Promise<{ id?: string; error?: string }> {
  const { supabase } = await requireTeacher();
  if (!validQuizId(quizId)) return { error: "Invalid quiz." };
  if (!createLobbyAdmin()) return { error: "Lobby service is not configured. Add the server-only Supabase secret key first." };
  if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") return { error: "Enable access to Vercel System Environment Variables before hosting a lobby." };
  const { data, error } = await supabase.rpc("create_teacher_lobby", { p_quiz_id: quizId });
  if (error || !data || !validQuizId(data.id)) return { error: "Couldn’t create the lobby. Choose a published quiz with questions and try again." };
  revalidatePath("/quizzes"); return { id: data.id };
}
export type GameCommand = "start" | "reveal" | "next" | "end";
export async function controlGame(id: string, command: GameCommand): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireTeacher();
  if (!validQuizId(id) || !["start", "reveal", "next", "end"].includes(command)) return { ok: false, error: "Invalid game action." };
  const { data, error } = await supabase.rpc("teacher_game_command", { p_session_id: id, p_command: command });
  if (error || !data) return { ok: false, error: "Couldn’t update the game. Check your connection and try again." };
  const messages: Record<string, string> = { no_players: "At least one student must join before starting.", expired: "This lobby has expired. End it and open a new one.", quiz_unavailable: "This quiz is no longer available to start.", invalid_state: "The game has changed. Refresh the page and try again.", not_found: "This game is not available." };
  if (!data.ok) return { ok: false, error: messages[data.error] || "Couldn’t update the game." };
  revalidatePath("/quizzes"); return { ok: true };
}
