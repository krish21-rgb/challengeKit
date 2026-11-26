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
export async function endLobby(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireTeacher();
  if (!validQuizId(id)) return { ok: false, error: "Invalid lobby." };
  const { data, error } = await supabase.rpc("end_teacher_lobby", { p_session_id: id });
  if (error || !data) return { ok: false, error: "Couldn’t end the lobby. Please try again." };
  revalidatePath("/quizzes"); return { ok: true };
}
