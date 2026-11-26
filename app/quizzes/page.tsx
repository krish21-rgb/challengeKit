import Link from "next/link";
import { ArrowRight, BookOpen, Plus, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getQuizzes } from "@/lib/quiz/queries";
import { TeacherShell } from "@/components/teacher-shell";
import { QuizActions } from "@/components/quiz/quiz-actions";

export const dynamic = "force-dynamic";
export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, profile } = await requireTeacher();
  const rawPage = Number((await searchParams).page ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 50000 ? rawPage : 1;
  const { quizzes, total, error } = await getQuizzes(supabase, page - 1);
  return <TeacherShell current="quizzes" name={profile.display_name}><div className="library-heading"><div><div className="workspace-kicker"><span /> YOUR QUIZ LIBRARY</div><h1>Made for curious minds<span className="accent-dot">.</span></h1><p className="workspace-lead">All your challenges, together in one little space.</p></div><Link className="button button-dark" href="/quizzes/create"><Plus size={17} /> Create a quiz</Link></div>
    {error ? <div className="workspace-empty library-error" role="alert"><p>We couldn’t load your quizzes. Check your connection and make sure the quiz database migration has been applied.</p></div> : total === 0 ? <div className="library-empty"><span className="library-empty-icon"><BookOpen size={29} /></span><span className="workspace-kicker"><span /> A FRESH START</span><h2>Your first challenge awaits.</h2><p>Big ideas start small. Create a quiz to get your learners thinking.</p><Link href="/quizzes/create" className="button button-dark"><Plus size={17} /> Create your first quiz</Link><span className="library-doodle" aria-hidden="true">✳</span></div> : <><div className="library-section-title"><div><h2>Your quizzes</h2><p>{total} {total === 1 ? "challenge" : "challenges"} in your collection</p></div><span><Sparkles size={15} /> MADE BY YOU</span></div><div className="library-grid">{quizzes.map(quiz => <article className="library-card" key={quiz.id}><div className="library-card-top"><span className="library-card-icon"><BookOpen size={21} /></span><span className={`quiz-status ${quiz.status}`}>{quiz.status}</span></div><h3><Link href={`/quizzes/${quiz.id}`}>{quiz.title}</Link></h3><p>{[quiz.subject, quiz.grade].filter(Boolean).join(" · ") || "Your challenge, your way"}</p><span className="library-date">UPDATED {new Date(quiz.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).toUpperCase()}</span><div className="library-card-bottom"><Link href={`/quizzes/${quiz.id}`} className="edit-quiz-link">Edit quiz <ArrowRight size={15} /></Link><QuizActions id={quiz.id} title={quiz.title} /></div></article>)}</div>{quizzes.length === 0 && <p className="library-page-empty">No quizzes on this page. <Link href="/quizzes">Return to the first page</Link>.</p>}{(page > 1 || page * 20 < total) && <nav className="pagination" aria-label="Quiz pages">{page > 1 && <Link href={`/quizzes?page=${page - 1}`}>← Previous</Link>}<span>Page {page}</span>{page * 20 < total && <Link href={`/quizzes?page=${page + 1}`}>Next →</Link>}</nav>}</>}
  </TeacherShell>;
}
