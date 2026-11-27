"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, Check, Copy, Play, Sparkles, Users } from "lucide-react";
import { controlGame, type GameCommand } from "@/app/host/actions";
import type { LobbyState } from "@/lib/lobby/model";
import { GamePanel } from "./game-panel";
import { Leaderboard } from "./leaderboard";

export function LobbyView({ initial, role, sessionId, joinUrl }: { initial: LobbyState; role: "host" | "player"; sessionId?: string; joinUrl?: string | null }) {
  const router = useRouter(); const [lobby, setLobby] = useState(initial);
  const [connection, setConnection] = useState("Checking for updates"); const [error, setError] = useState(""); const [connectionError, setConnectionError] = useState(""); const [copied, setCopied] = useState<"pin" | "link" | null>(null);
  const [pending, startTransition] = useTransition(); const channelRef = useRef<RealtimeChannel | null>(null); const statusRef = useRef(initial.status); const refreshRef = useRef<(() => void) | null>(null);
  const [remaining, setRemaining] = useState(() => initial.question && initial.serverNow ? Math.max(0, Math.ceil((Date.parse(initial.question.closesAt) - Date.parse(initial.serverNow)) / 1000)) : 0);
  useEffect(() => {
    const closesAt = lobby.question?.closesAt; const serverNow = lobby.serverNow;
    if (!closesAt || !serverNow || lobby.status !== "question") return;
    const duration = Math.max(0, Date.parse(closesAt) - Date.parse(serverNow)); const started = performance.now();
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((duration - (performance.now() - started)) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [lobby.question?.index, lobby.question?.closesAt, lobby.serverNow, lobby.status]);
  useEffect(() => {
    let active = true; let inFlight = false; let lastRefresh = 0;
    const url = role === "host" ? `/api/lobby/host/${sessionId}` : `/api/lobby/player/${initial.code}`;
    async function refresh(force = false) {
      if (!active || inFlight || (!force && Date.now() - lastRefresh < 750)) return;
      inFlight = true; lastRefresh = Date.now();
      try { const response = await fetch(url, { cache: "no-store" }); if (response.ok) { const data: LobbyState = await response.json(); if (active) { statusRef.current = data.status; setLobby(data); setConnectionError(""); } } else if (active) setConnectionError("We couldn’t refresh the game. We’ll keep trying."); }
      catch { if (active) setConnectionError("Connection interrupted. We’ll keep trying."); }
      finally { inFlight = false; }
    }
    refreshRef.current = () => { void refresh(true); };
    async function heartbeat() {
      if (!active || role !== "player" || !["waiting", "question", "reveal"].includes(statusRef.current)) return;
      try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch { /* The next heartbeat will retry. */ }
    }
    const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    let client: ReturnType<typeof createClient> | undefined;
    if (urlValue && key) {
      try {
        client = createClient(urlValue, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const channel = client.channel(`lobby:${initial.channelId}`, { config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } } }); channelRef.current = channel;
        // Notifications are untrusted invalidations; the server supplies all state.
        channel.on("broadcast", { event: "changed" }, () => { void refresh(); });
        channel.on("presence", { event: "sync" }, () => { void refresh(); });
        channel.subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") { setConnection("Live updates connected"); void channel.track({ kind: "connected" }); void channel.send({ type: "broadcast", event: "changed", payload: {} }); void refresh(true); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection("Reconnecting · checking for updates");
        });
      } catch { /* Polling remains available if Realtime is unavailable. */ }
    }
    void heartbeat(); void refresh(true);
    const poll = window.setInterval(() => { void refresh(true); }, 2000);
    const beat = window.setInterval(() => { void heartbeat(); }, 15000);
    return () => { active = false; window.clearInterval(poll); window.clearInterval(beat); refreshRef.current = null; channelRef.current = null; if (client) void client.removeAllChannels(); };
  }, [role, initial.code, initial.channelId, sessionId]);
  async function announce() { try { await channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} }); } catch { /* Polling remains available. */ } }
  function command(action: GameCommand) {
    if (!sessionId) return;
    if (action === "end" && !window.confirm("End this game? Students will no longer be able to answer.")) return;
    if (action === "reveal" && remaining > 0 && !window.confirm("Reveal answers now? This will close the question for everyone.")) return;
    setError(""); startTransition(async () => { try { const result = await controlGame(sessionId, action); if (!result.ok) { setError(result.error || "Couldn’t update the game."); refreshRef.current?.(); return; } await announce(); refreshRef.current?.(); } catch { setError("Couldn’t update the game. Please try again."); } });
  }
  function answer(index: number) {
    const questionIndex = lobby.question?.index; if (questionIndex === undefined) return;
    setError(""); startTransition(async () => { try {
      const response = await fetch(`/api/lobby/player/${initial.code}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionIndex, optionIndex: index }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Couldn’t submit your answer."); refreshRef.current?.(); return; }
      setLobby(previous => previous.question?.index === questionIndex && previous.status === "question" ? { ...previous, question: { ...previous.question, selectedIndex: index } } : previous);
      await announce(); refreshRef.current?.();
    } catch { setError("Couldn’t submit your answer. Check your connection and try again."); } });
  }
  function leaveGame() {
    setError(""); startTransition(async () => { try { const response = await fetch(`/api/lobby/player/${initial.code}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!response.ok) { setError("Couldn’t leave the game. Please try again."); return; } await announce(); router.push("/join"); } catch { setError("Couldn’t leave the game. Please try again."); } });
  }
  async function copy(value: string, kind: "pin" | "link") { try { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 2000); } catch { setError("Couldn’t copy. You can select and copy the address or PIN from the screen."); } }
  const waiting = lobby.status === "waiting", question = lobby.status === "question", reveal = lobby.status === "reveal", finished = lobby.status === "finished", active = waiting || question || reveal;
  const statusText = waiting ? "WAITING LOBBY" : question ? "QUESTION LIVE" : reveal ? "ANSWER REVEAL" : finished ? "GAME FINISHED" : lobby.status === "expired" ? "GAME EXPIRED" : "LOBBY ENDED";
  return <div className={`lobby-view ${role}`}><div className="lobby-topline">{role === "host" ? <Link className="back-to-quizzes" href="/quizzes"><ArrowLeft size={15} /> My quizzes</Link> : <span className="workspace-kicker"><span /> READY TO LEARN</span>}<span className={`lobby-state ${active ? "waiting" : "closed"}`}><i /> {statusText}</span></div>
    <div className="lobby-heading"><div><div className="workspace-kicker"><span /> {role === "host" ? "YOUR LIVE GAME" : "YOU’RE IN!"}</div><h1>{finished ? "A challenge well played" : waiting ? role === "host" ? "Let’s bring everyone in" : `Hey, ${lobby.nickname ?? "learner"}` : role === "host" ? "Let’s keep learning" : "You’ve got this"}<span className="accent-dot">.</span></h1><p>{finished ? lobby.finishReason === "stopped" ? "The teacher ended this game early. Here are the saved results." : "Here’s how everyone did." : waiting ? role === "host" ? "Share the PIN and watch your learners arrive." : "You made it! Hang tight while everyone joins." : active ? lobby.title : lobby.status === "expired" ? "This game expired. Ask the teacher to end it and start a new one." : "This lobby has ended."}</p></div><span className="lobby-heading-art" aria-hidden="true">✳</span></div>
    {error && <p className="form-notice form-error lobby-message" role="alert">{error}</p>}{connectionError && <p className="form-notice form-error lobby-message" role="status">{connectionError}</p>}
    <div className="lobby-grid"><div>{(question || reveal) && lobby.question ? <GamePanel lobby={lobby} role={role} remaining={remaining} pending={pending} onAnswer={answer} /> : <div className="lobby-main-card"><div className="lobby-card-kicker"><Sparkles size={15} /> THE CHALLENGE</div><h2>{lobby.title}</h2><p>{waiting ? role === "host" ? "Ask students to open the join page and enter this PIN." : "You’re in the waiting room. Your teacher will start the quiz soon." : finished ? "Scores are saved for this completed session." : "Thanks for stopping by!"}</p>{role === "host" && waiting && <div className="pin-box"><span>GAME PIN</span><strong>{lobby.code}</strong><button type="button" onClick={() => copy(lobby.code, "pin")} aria-label="Copy game PIN">{copied === "pin" ? <Check size={16} /> : <Copy size={16} />}{copied === "pin" ? "Copied" : "Copy PIN"}</button>{joinUrl ? <div className="join-share"><span>STUDENTS JOIN AT</span><a href={joinUrl} target="_blank" rel="noopener noreferrer">{joinUrl}</a><button type="button" onClick={() => copy(joinUrl, "link")} aria-label="Copy student join link">{copied === "link" ? <Check size={15} /> : <Copy size={15} />}{copied === "link" ? "Copied" : "Copy join link"}</button></div> : <small>The public join link isn’t configured. Ask your administrator to set NEXT_PUBLIC_SITE_URL.</small>}</div>}{role === "player" && waiting && <div className="player-waiting"><span>✳</span><div><strong>You’re on the list!</strong><p>Keep this page open while your teacher gets ready.</p></div></div>}{finished && role === "player" && <div className="player-waiting"><span>✳</span><div><strong>Your score: {lobby.score ?? 0} points</strong><p>Every little challenge is a chance to learn.</p></div></div>}</div>}
    {role === "host" && active && <div className="game-controls">{waiting && <button type="button" className="button button-dark" onClick={() => command("start")} disabled={pending || lobby.players.length === 0}><Play size={16} fill="currentColor" /> {pending ? "Starting…" : "Start quiz"}</button>}{question && <button type="button" className="button button-dark" onClick={() => command("reveal")} disabled={pending}>{pending ? "Revealing…" : "Reveal answers"}</button>}{reveal && <button type="button" className="button button-dark" onClick={() => command("next")} disabled={pending}>{pending ? "Loading…" : lobby.question && lobby.question.index + 1 >= lobby.question.total ? "Finish & show results" : "Next question"}</button>}<p>{waiting ? "At least one player must join to start." : question ? "Reveal when time is up, or close the question early." : "Review the answers, then continue."}</p></div>}</div>
    {(reveal || finished) ? <Leaderboard entries={lobby.leaderboard ?? []} playerId={lobby.playerId} final={finished} /> : <div className="players-card"><div className="players-heading"><div><span className="workspace-kicker"><span /> THE CREW</span><h2>Players <span>{lobby.players.length}</span></h2></div><span className="players-icon"><Users size={20} /></span></div><p className="connection-indicator"><i /> {connection}</p>{lobby.players.length === 0 ? <div className="players-empty"><span>✳</span><strong>Waiting for the first hello.</strong><p>Players will appear here as they join.</p></div> : <ul className="players-list">{lobby.players.map((player, i) => <li key={player.id}><span className={`player-avatar tone-${i % 4}`}>{player.nickname.slice(0, 1).toUpperCase()}</span><strong>{player.nickname}{player.id === lobby.playerId && <small> YOU</small>}</strong><span className={player.online ? "player-online" : "player-offline"}>{player.online ? "Online" : "Reconnecting"}</span></li>)}</ul>}</div>}</div>
    <div className="lobby-bottom"><p>{waiting ? "Lobby PINs are valid for up to 6 hours. Reopen the same page to reconnect." : active ? "Answers and timers are controlled by the server." : "Want to try another challenge? Head back when you’re ready."}</p>{role === "host" && (active || lobby.status === "expired") ? <button type="button" className="button button-outline" onClick={() => command("end")} disabled={pending}>End {waiting ? "lobby" : "game"}</button> : role === "player" && active ? <button type="button" className="button button-outline" onClick={leaveGame} disabled={pending}>{pending ? "Leaving…" : "Leave game"}</button> : <Link className="button button-outline" href={role === "host" ? "/quizzes" : "/join"}>{role === "host" ? "Back to quizzes" : "Join another game"}</Link>}</div>
  </div>;
}
