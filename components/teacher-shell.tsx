import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { signOut } from "@/app/auth/actions";

export function TeacherShell({ children, current, name }: { children: React.ReactNode; current: "dashboard" | "settings"; name: string }) {
  return <div className="teacher-layout"><aside className="teacher-sidebar"><Brand /><span className="sidebar-label">YOUR WORKSPACE</span><nav aria-label="Teacher navigation"><Link className={current === "dashboard" ? "teacher-nav active" : "teacher-nav"} href="/dashboard" aria-current={current === "dashboard" ? "page" : undefined}><LayoutDashboard size={18} /> Dashboard</Link><Link className={current === "settings" ? "teacher-nav active" : "teacher-nav"} href="/settings" aria-current={current === "settings" ? "page" : undefined}><Settings size={18} /> Settings</Link></nav><div className="sidebar-note"><Sparkles size={18} /><strong>Little steps, big things.</strong><p>Your teacher space is just getting started.</p></div><form action={signOut}><button className="signout" type="submit"><LogOut size={17} /> Sign out</button></form></aside><div className="teacher-main"><header className="teacher-header"><span>YOUR TEACHER SPACE <span>✳</span></span><div className="teacher-user"><span className="user-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><span>{name}</span></div></header><main className="teacher-content">{children}</main></div></div>;
}
