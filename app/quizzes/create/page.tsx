import { requireTeacher } from "@/lib/auth/require-teacher";
import { TeacherShell } from "@/components/teacher-shell";
import { QuizEditor } from "@/components/quiz/quiz-editor";
export const dynamic = "force-dynamic";
export default async function CreateQuizPage() {
  const { profile } = await requireTeacher();
  return <TeacherShell current="quizzes" name={profile.display_name}><QuizEditor /></TeacherShell>;
}
