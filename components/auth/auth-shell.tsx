import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return <main className="auth-page">
    <div className="auth-panel">
      <div className="auth-header"><Brand /><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to home</Link></div>
      <div className="auth-content"><span className="section-kicker"><span /> YOUR TEACHER SPACE</span><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div>
      <p className="auth-footer">A LITTLE CURIOSITY GOES A LONG WAY <span>✳</span></p>
    </div>
    <aside className="auth-aside" aria-label="Our mission"><div className="auth-aside-decoration">✳</div><span className="aside-label"><Sparkles size={15} /> MADE FOR CURIOUS MINDS</span><h2>Good things happen when we <em>learn together.</em></h2><p>More curiosity, more connection, and more moments worth celebrating.</p><div className="aside-note"><span>✦</span> A little challenge can go a long way.</div></aside>
  </main>;
}
