import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LobbyView } from "@/components/lobby/lobby-view";
import { createLobbyAdmin, guestCookieName, tokenHash, validGuestToken } from "@/lib/lobby/server";
import { validPin, type LobbyState } from "@/lib/lobby/model";
export const dynamic = "force-dynamic";
export default async function PlayPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = await params;
  if (!validPin(gameCode)) redirect("/join");
  const token = (await cookies()).get(guestCookieName(gameCode))?.value;
  if (!validGuestToken(token)) redirect("/join");
  const admin = createLobbyAdmin();
  if (!admin) return <main className="join-page"><header className="join-header"><Brand /></header><div className="join-content"><div className="join-card"><h1>One moment<span className="accent-dot">.</span></h1><p>The lobby service isn’t configured yet. Please ask your teacher for help.</p><Link href="/join" className="button button-dark">Back to join</Link></div></div></main>;
  const { data, error } = await admin.rpc("guest_lobby_state", { p_pin: gameCode, p_token_hash: tokenHash(token) });
  if (error) return <main className="join-page"><header className="join-header"><Brand /></header><div className="join-content"><div className="join-card"><h1>Connection hiccup<span className="accent-dot">.</span></h1><p>We couldn’t load your lobby. Please refresh or try again.</p><Link href="/join" className="button button-dark">Back to join</Link></div></div></main>;
  if (!data) redirect("/join");
  return <main className="player-layout"><header className="join-header"><Brand /><span className="player-header-label">STUDENT LOBBY <span>✳</span></span></header><div className="player-main"><LobbyView initial={data as LobbyState} role="player" /></div></main>;
}
