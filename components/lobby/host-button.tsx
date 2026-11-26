"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { createLobby } from "@/app/host/actions";
export function HostButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function host() {
    setError(""); startTransition(async () => {
      try { const result = await createLobby(quizId); if (result.id) router.push(`/host/${result.id}`); else setError(result.error || "Couldn’t open the lobby."); }
      catch { setError("Couldn’t open the lobby. Please try again."); }
    });
  }
  return <div className="host-action"><button type="button" className="host-quiz-button" disabled={pending} onClick={host}><Play size={13} fill="currentColor" /> {pending ? "Opening…" : "Host lobby"}</button>{error && <p className="card-action-error" role="alert">{error}</p>}</div>;
}
