import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { JoinForm } from "@/components/lobby/join-form";
export default function JoinPage() {
  return <main className="join-page"><header className="join-header"><Brand /><Link className="back-link" href="/"><ArrowLeft size={15} /> Back to home</Link></header><div className="join-content"><span className="join-decoration join-star-one">✳</span><span className="join-decoration join-star-two">✦</span><div className="join-card"><span className="join-card-icon"><Sparkles size={24} /></span><div className="workspace-kicker"><span /> LET’S PLAY TOGETHER</div><h1>Come on in<span className="accent-dot">.</span></h1><p>Got a PIN? Your next little adventure is just a few taps away.</p><JoinForm /></div><p className="join-footer">A LITTLE CURIOSITY GOES A LONG WAY <span>✳</span></p></div></main>;
}
