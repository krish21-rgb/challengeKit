import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/auth/require-teacher";
import { TeacherShell } from "@/components/teacher-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireTeacher();
  return <TeacherShell current="dashboard" name={profile.display_name}>
    <div className="workspace-kicker"><span /> YOUR DASHBOARD</div>
    <h1>Welcome, {profile.display_name}<span className="accent-dot">.</span></h1>
    <p className="workspace-lead">A little space for big learning moments. We’re glad you’re here.</p>
    <div className="welcome-card"><div><span className="welcome-label"><Sparkles size={15} /> YOUR SPACE IS READY</span><h2>Every great lesson starts with curiosity.</h2><p>Your teacher account is set up. Quiz creation and live challenges are coming in a future phase.</p><Link className="button button-dark" href="/settings">Set up your profile <ArrowRight size={17} /></Link></div><span className="welcome-art" aria-hidden="true">✳</span></div>
    <div className="workspace-section-heading"><div><h2>Your teaching toolkit</h2><p>There’s more to come. Here’s where the adventure begins.</p></div><span>01 / 01</span></div>
    <div className="workspace-empty"><span className="empty-icon"><BookOpen size={24} /></span><div><h3>Quizzes are coming next</h3><p>When quiz creation is ready, your challenges will have a home here. No sample data, just your real work.</p></div><span className="coming-badge">COMING LATER</span></div>
  </TeacherShell>;
}
