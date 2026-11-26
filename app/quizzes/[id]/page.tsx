import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getQuiz } from "@/lib/quiz/queries";
import { validQuizId } from "@/lib/quiz/model";
import { TeacherShell } from "@/components/teacher-shell";
import { QuizEditor } from "@/components/quiz/quiz-editor";
export const dynamic = "force-dynamic";
export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, profile } = await requireTeacher();
  const { id } = await params;
  if (!validQuizId(id)) notFound();
  const { quiz, error } = await getQuiz(supabase, id);
  if (error) return <TeacherShell current="quizzes" name={profile.display_name}><div className="workspace-empty" role="alert"><p>We couldn’t load this quiz. Check your connection and try again.</p><Link className="edit-quiz-link" href="/quizzes">Back to quizzes</Link></div></TeacherShell>;
  if (!quiz) notFound();
  return <TeacherShell current="quizzes" name={profile.display_name}><QuizEditor initial={quiz} /></TeacherShell>;
}
