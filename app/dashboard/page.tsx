import Link from "next/link";
import { ArrowRight, BookOpen, FileCheck2, FilePenLine, Plus, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { getPublishedCount, getQuizzes } from "@/lib/quiz/queries";
import { TeacherShell } from "@/components/teacher-shell";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const { profile, supabase } = await requireTeacher();
  const [collection, publishedCount] = await Promise.all([getQuizzes(supabase, 0, 4), getPublishedCount(supabase)]);
  const { quizzes, total } = collection;
  const published = publishedCount.total;
  const error = collection.error || publishedCount.error;
  return <TeacherShell current="dashboard" name={profile.display_name}>
    <div className="workspace-kicker"><span /> YOUR DASHBOARD</div><h1>Welcome, {profile.display_name}<span className="accent-dot">.</span></h1><p className="workspace-lead">A little space for big learning moments. We’re glad you’re here.</p>
    <div className="welcome-card"><div><span className="welcome-label"><Sparkles size={15} /> LET CURIOSITY LEAD</span><h2>Every great lesson starts with curiosity.</h2><p>Turn your ideas into little challenges that make a big difference.</p><Link className="button button-dark" href="/quizzes/create">Create a quiz <ArrowRight size={17} /></Link></div><span className="welcome-art" aria-hidden="true">✳</span></div>
    <div className="workspace-section-heading"><div><h2>Your quiz collection</h2><p>A little look at what you’ve been creating.</p></div><Link className="edit-quiz-link" href="/quizzes">View all <ArrowRight size={15} /></Link></div>
    {error ? <div className="workspace-empty" role="alert"><p>We couldn’t load your quiz data. Check your connection and apply the quiz database migration.</p></div> : <><div className="stats-grid"><div className="stat-card"><span className="stat-icon"><BookOpen size={19} /></span><span>TOTAL QUIZZES</span><strong>{total}</strong></div><div className="stat-card"><span className="stat-icon stat-green"><FileCheck2 size={19} /></span><span>PUBLISHED</span><strong>{published}</strong></div><div className="stat-card"><span className="stat-icon stat-peach"><FilePenLine size={19} /></span><span>DRAFTS</span><strong>{total - published}</strong></div></div>
    <div className="workspace-section-heading recent-heading"><div><h2>Recent quiz activity</h2><p>Your latest ideas, ready when you are.</p></div></div>{quizzes.length === 0 ? <div className="workspace-empty"><span className="empty-icon"><BookOpen size={24} /></span><div><h3>No quizzes yet</h3><p>Create your first challenge to get started.</p></div><Link className="edit-quiz-link" href="/quizzes/create"><Plus size={15} /> Create quiz</Link></div> : <div className="recent-list">{quizzes.slice(0, 4).map(q => <Link className="recent-row" href={`/quizzes/${q.id}`} key={q.id}><span className="recent-icon"><BookOpen size={17} /></span><span><strong>{q.title}</strong><small>{q.subject || "Your quiz"}</small></span><span className={`quiz-status ${q.status}`}>{q.status}</span><ArrowRight size={16} /></Link>)}</div>}</>}
  </TeacherShell>;
}
