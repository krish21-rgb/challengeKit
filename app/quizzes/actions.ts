"use server";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getQuiz } from "@/lib/quiz/queries";
import { validateQuiz, validQuizId, type QuizData } from "@/lib/quiz/model";

export type QuizActionResult = { ok: boolean; error?: string; id?: string; updatedAt?: string };
export async function saveQuiz(id: string | null, updatedAt: string | null, input: unknown): Promise<QuizActionResult> {
  const { supabase } = await requireTeacher();
  const error = validateQuiz(input);
  if (error) return { ok: false, error };
  if ((id !== null && (!validQuizId(id) || !updatedAt || Number.isNaN(Date.parse(updatedAt)))) || (id === null && updatedAt !== null)) return { ok: false, error: "Invalid quiz version. Reload and try again." };
  const { data, error: saveError } = await supabase.rpc("save_teacher_quiz", { p_quiz_id: id, p_expected_updated_at: updatedAt, p_payload: input });
  if (saveError?.message?.includes("End the waiting lobby")) return { ok: false, error: "End this quiz’s lobby or active game before editing it." };
  if (saveError || !data || !validQuizId(data.id) || typeof data.updatedAt !== "string") return { ok: false, error: id ? "Could not save. The quiz may have changed in another tab; reload before trying again." : "Could not save your quiz. Check your connection and try again." };
  revalidatePath("/dashboard"); revalidatePath("/quizzes"); revalidatePath(`/quizzes/${data.id}`);
  return { ok: true, id: data.id, updatedAt: data.updatedAt };
}
export async function deleteQuiz(id: string): Promise<QuizActionResult> {
  const { supabase } = await requireTeacher();
  if (!validQuizId(id)) return { ok: false, error: "Invalid quiz." };
  const { data, error } = await supabase.rpc("delete_teacher_quiz", { p_quiz_id: id });
  if (error?.message?.includes("End the waiting lobby")) return { ok: false, error: "End this quiz’s lobby or active game before deleting it." };
  if (error || !data) return { ok: false, error: "Could not delete the quiz. Please try again." };
  revalidatePath("/dashboard"); revalidatePath("/quizzes");
  return { ok: true };
}
export async function duplicateQuiz(id: string): Promise<QuizActionResult> {
  const { supabase } = await requireTeacher();
  if (!validQuizId(id)) return { ok: false, error: "Invalid quiz." };
  const { quiz, error } = await getQuiz(supabase, id);
  if (error || !quiz) return { ok: false, error: "Could not find the quiz to duplicate." };
  const copy: QuizData = { ...quiz, title: `${quiz.title.slice(0, 113)} (copy)`, status: "draft" };
  const validation = validateQuiz(copy);
  if (validation) return { ok: false, error: validation };
  const { data, error: saveError } = await supabase.rpc("save_teacher_quiz", { p_quiz_id: null, p_expected_updated_at: null, p_payload: copy });
  if (saveError || !data || !validQuizId(data.id)) return { ok: false, error: "Could not duplicate the quiz. Please try again." };
  revalidatePath("/dashboard"); revalidatePath("/quizzes");
  return { ok: true, id: data.id };
}
