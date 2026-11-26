"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, Check, Copy, Radio, Sparkles, Users } from "lucide-react";
import { endLobby } from "@/app/host/actions";
import type { LobbyState } from "@/lib/lobby/model";

export function LobbyView({ initial, role, sessionId, joinUrl }: { initial: LobbyState; role: "host" | "player"; sessionId?: string; joinUrl?: string | null }) {
  const router = useRouter(); const [lobby, setLobby] = useState(initial);
  const [connection, setConnection] = useState("Checking for updates"); const [error, setError] = useState(""); const [copied, setCopied] = useState<"pin" | "link" | null>(null);
  const [pending, startTransition] = useTransition(); const channelRef = useRef<RealtimeChannel | null>(null); const statusRef = useRef(initial.status);
  useEffect(() => { statusRef.current = lobby.status; }, [lobby.status]);
  useEffect(() => {
    let active = true; let inFlight = false; let lastRefresh = 0;
    const url = role === "host" ? `/api/lobby/host/${sessionId}` : `/api/lobby/player/${initial.code}`;
    async function refresh(force = false) {
      if (!active || inFlight || (!force && Date.now() - lastRefresh < 750)) return;
      inFlight = true; lastRefresh = Date.now();
      try { const response = await fetch(url, { cache: "no-store" }); if (response.ok) { const data = await response.json(); if (active) { setLobby(data); setError(""); } } else if (active) setError("We couldn’t refresh the lobby. We’ll keep trying."); }
      catch { if (active) setError("Connection interrupted. We’ll keep trying."); }
      finally { inFlight = false; }
    }
    async function heartbeat() {
      if (!active || role !== "player" || statusRef.current !== "waiting") return;
      try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch { /* The next heartbeat will retry. */ }
    }
    const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    let client: ReturnType<typeof createClient> | undefined;
    if (urlValue && key) {
      try {
        client = createClient(urlValue, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const channel = client.channel(`lobby:${initial.channelId}`, { config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } } });
        channelRef.current = channel;
        // Realtime carries only untrusted invalidation signals, never state or answers.
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
    const poll = window.setInterval(() => { void refresh(true); }, 6000);
    const beat = window.setInterval(() => { void heartbeat(); }, 15000);
    return () => { active = false; window.clearInterval(poll); window.clearInterval(beat); channelRef.current = null; if (client) void client.removeAllChannels(); };
  }, [role, initial.code, initial.channelId, sessionId]);
  async function announce() { try { await channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} }); } catch { /* Polling remains available. */ } }
  function closeLobby() {
    if (!sessionId || !window.confirm("End this lobby? Students will no longer be able to join.")) return;
    setError(""); startTransition(async () => { try { const result = await endLobby(sessionId); if (!result.ok) { setError(result.error || "Couldn’t end the lobby."); return; } setLobby(v => ({ ...v, status: "ended" })); statusRef.current = "ended"; await announce(); } catch { setError("Couldn’t end the lobby. Please try again."); } });
  }
  function leaveLobby() {
    setError(""); startTransition(async () => { try { const response = await fetch(`/api/lobby/player/${initial.code}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!response.ok) { setError("Couldn’t leave the lobby. Please try again."); return; } await announce(); router.push("/join"); } catch { setError("Couldn’t leave the lobby. Please try again."); } });
  }
  async function copy(value: string, kind: "pin" | "link") { try { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 2000); } catch { setError("Couldn’t copy. You can select and copy the address or PIN from the screen."); } }
  const waiting = lobby.status === "waiting";
  return <div className={`lobby-view ${role}`}><div className="lobby-topline">{role === "host" ? <Link className="back-to-quizzes" href="/quizzes"><ArrowLeft size={15} /> My quizzes</Link> : <span className="workspace-kicker"><span /> READY TO LEARN</span>}<span className={`lobby-state ${waiting ? "waiting" : "closed"}`}><i /> {waiting ? "WAITING LOBBY" : lobby.status === "expired" ? "LOBBY EXPIRED" : "LOBBY ENDED"}</span></div>
    <div className="lobby-heading"><div><div className="workspace-kicker"><span /> {role === "host" ? "YOUR LIVE LOBBY" : "YOU’RE IN!"}</div><h1>{role === "host" ? "Let’s bring everyone in" : `Hey, ${lobby.nickname ?? "learner"}`}<span className="accent-dot">.</span></h1><p>{role === "host" ? "Share the PIN and watch your learners arrive." : "You made it! Hang tight while everyone joins."}</p></div><span className="lobby-heading-art" aria-hidden="true">✳</span></div>
    {error && <p className="form-notice form-error lobby-message" role="alert">{error}</p>}
    <div className="lobby-grid"><div className="lobby-main-card"><div className="lobby-card-kicker"><Sparkles size={15} /> THE CHALLENGE</div><h2>{lobby.title}</h2><p>{waiting ? role === "host" ? "Ask students to open the join page and enter this PIN." : "You’re in the waiting room. Your teacher is getting everything ready." : lobby.status === "expired" ? "This lobby has expired. Ask your teacher to open a new one." : "This lobby has ended. Thanks for stopping by!"}</p>{role === "host" && waiting && <div className="pin-box"><span>GAME PIN</span><strong>{lobby.code}</strong><button type="button" onClick={() => copy(lobby.code, "pin")} aria-label="Copy game PIN">{copied === "pin" ? <Check size={16} /> : <Copy size={16} />}{copied === "pin" ? "Copied" : "Copy PIN"}</button>{joinUrl ? <div className="join-share"><span>STUDENTS JOIN AT</span><a href={joinUrl} target="_blank" rel="noopener noreferrer">{joinUrl}</a><button type="button" onClick={() => copy(joinUrl, "link")} aria-label="Copy student join link">{copied === "link" ? <Check size={15} /> : <Copy size={15} />}{copied === "link" ? "Copied" : "Copy join link"}</button></div> : <small>The public join link isn’t configured. Ask your administrator to set NEXT_PUBLIC_SITE_URL.</small>}</div>}{role === "player" && waiting && <div className="player-waiting"><span>✳</span><div><strong>You’re on the list!</strong><p>Keep this page open while your teacher gets ready.</p></div></div>}<div className="lobby-phase-note"><Radio size={17} /><span>This is a waiting lobby. Live quiz questions and scoring are coming in the next step.</span></div></div>
    <div className="players-card"><div className="players-heading"><div><span className="workspace-kicker"><span /> THE CREW</span><h2>Players <span>{lobby.players.length}</span></h2></div><span className="players-icon"><Users size={20} /></span></div><p className="connection-indicator"><i /> {connection}</p>{lobby.players.length === 0 ? <div className="players-empty"><span>✳</span><strong>Waiting for the first hello.</strong><p>Players will appear here as they join.</p></div> : <ul className="players-list">{lobby.players.map((player, i) => <li key={player.id}><span className={`player-avatar tone-${i % 4}`}>{player.nickname.slice(0, 1).toUpperCase()}</span><strong>{player.nickname}{role === "player" && player.nickname === lobby.nickname && <small> YOU</small>}</strong><span className={player.online ? "player-online" : "player-offline"}>{player.online ? "Online" : "Reconnecting"}</span></li>)}</ul>}</div></div>
    <div className="lobby-bottom"><p>{waiting ? "Lobby PINs are valid for up to 6 hours. Reopen the same page to reconnect." : "Want to try another challenge? Head back when you’re ready."}</p>{role === "host" && lobby.status !== "ended" ? <button type="button" className="button button-outline" onClick={closeLobby} disabled={pending}>{pending ? "Ending…" : "End lobby"}</button> : role === "player" && waiting ? <button type="button" className="button button-outline" onClick={leaveLobby} disabled={pending}>{pending ? "Leaving…" : "Leave lobby"}</button> : <Link className="button button-outline" href={role === "host" ? "/quizzes" : "/join"}>{role === "host" ? "Back to quizzes" : "Join another game"}</Link>}</div>
  </div>;
}
