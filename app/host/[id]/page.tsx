import { notFound } from "next/navigation";
import { TeacherShell } from "@/components/teacher-shell";
import { LobbyView } from "@/components/lobby/lobby-view";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { validQuizId } from "@/lib/quiz/model";
import { getJoinUrl } from "@/lib/lobby/join-url";
import type { LobbyState } from "@/lib/lobby/model";
export const dynamic = "force-dynamic";
export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, profile } = await requireTeacher(); const { id } = await params;
  if (!validQuizId(id)) notFound();
  const { data, error } = await supabase.rpc("teacher_lobby_state", { p_session_id: id });
  if (error) return <TeacherShell current="quizzes" name={profile.display_name}><div className="workspace-empty" role="alert"><p>Couldn’t load the lobby. Make sure the lobby database migration is installed and try again.</p></div></TeacherShell>;
  if (!data) notFound();
  return <TeacherShell current="quizzes" name={profile.display_name}><LobbyView initial={data as LobbyState} role="host" sessionId={id} joinUrl={getJoinUrl(process.env.NEXT_PUBLIC_SITE_URL)} /></TeacherShell>;
}
