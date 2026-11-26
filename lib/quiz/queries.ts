import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuizRecord } from "./model";

type DbOption = { option_text: string; position: number; is_correct: boolean };
type DbQuestion = { id: string; question_text: string; explanation: string; time_limit: number; points: number; position: number; answer_options: DbOption[] };
type DbQuiz = { id: string; title: string; description: string; subject: string; grade: string; topic: string; cover_url: string; status: "draft" | "published"; updated_at: string; questions: DbQuestion[] };
export type QuizSummary = { id: string; title: string; subject: string; grade: string; status: "draft" | "published"; updated_at: string };

export async function getQuiz(supabase: SupabaseClient, id: string): Promise<{ quiz: QuizRecord | null; error: boolean }> {
  const { data, error } = await supabase.from("quizzes").select("id, title, description, subject, grade, topic, cover_url, status, updated_at, questions(id, question_text, explanation, time_limit, points, position, answer_options(option_text, position, is_correct))").eq("id", id).maybeSingle();
  if (error || !data) return { quiz: null, error: !!error };
  const row = data as unknown as DbQuiz;
  return { error: false, quiz: { id: row.id, title: row.title, description: row.description, subject: row.subject, grade: row.grade, topic: row.topic, coverUrl: row.cover_url, status: row.status, updatedAt: row.updated_at,
    questions: [...row.questions].sort((a, b) => a.position - b.position).map((q) => {
      const options = [...q.answer_options].sort((a, b) => a.position - b.position);
      return { clientId: q.id, text: q.question_text, explanation: q.explanation, timeLimit: q.time_limit, points: q.points, options: options.map(o => o.option_text), correctIndex: options.findIndex(o => o.is_correct) };
    }) } };
}
export async function getQuizzes(supabase: SupabaseClient, page = 0, pageSize = 20): Promise<{ quizzes: QuizSummary[]; total: number; error: boolean }> {
  const { data, error, count } = await supabase.from("quizzes").select("id,title,subject,grade,status,updated_at", { count: "exact" }).order("updated_at", { ascending: false }).order("id", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
  return { quizzes: (data ?? []) as QuizSummary[], total: count ?? 0, error: !!error };
}
export async function getPublishedCount(supabase: SupabaseClient): Promise<{ total: number; error: boolean }> {
  const { error, count } = await supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("status", "published");
  return { total: count ?? 0, error: !!error };
}
