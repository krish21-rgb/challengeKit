"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { validPin, validateNickname } from "@/lib/lobby/model";
export function JoinForm() {
  const router = useRouter();
  const [pin, setPin] = useState(""); const [nickname, setNickname] = useState("");
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validPin(pin)) { setError("Enter the 6-digit PIN from your teacher."); return; }
    const invalid = validateNickname(nickname); if (invalid) { setError(invalid); return; }
    setError(""); setPending(true);
    try {
      const response = await fetch("/api/lobby/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, nickname }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Couldn’t join. Please try again."); setPending(false); return; }
      router.push(`/play/${pin}`);
    } catch { setError("Couldn’t connect. Check your internet and try again."); setPending(false); }
  }
  return <form className="account-form join-form" onSubmit={submit}><label>Game PIN<input inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required placeholder="6-digit PIN" /></label><label>Your nickname<input autoComplete="nickname" minLength={2} maxLength={24} value={nickname} onChange={e => setNickname(e.target.value)} required placeholder="What should we call you?" /></label>{error && <p role="alert" className="form-notice form-error">{error}</p>}<button type="submit" className="button button-dark account-submit" disabled={pending}>{pending ? "Joining…" : "Join the lobby"}<ArrowRight size={17} /></button><p className="join-note">No account needed. Ask your teacher for the PIN.</p></form>;
}
