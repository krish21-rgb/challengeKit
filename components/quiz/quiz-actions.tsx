"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { deleteQuiz, duplicateQuiz } from "@/app/quizzes/actions";

export function QuizActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function duplicate() {
    setError("");
    startTransition(async () => { try { const result = await duplicateQuiz(id); if (result.ok && result.id) router.push(`/quizzes/${result.id}`); else setError(result.error || "Could not duplicate the quiz."); } catch { setError("Could not duplicate the quiz. Please try again."); } });
  }
  function remove() {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setError("");
    startTransition(async () => { try { const result = await deleteQuiz(id); if (result.ok) router.refresh(); else setError(result.error || "Could not delete the quiz."); } catch { setError("Could not delete the quiz. Please try again."); } });
  }
  return <div className="card-actions-wrap"><div className="quiz-card-actions"><button type="button" onClick={duplicate} disabled={pending} aria-label={`Duplicate ${title}`}><Copy size={15} /> Duplicate</button><button type="button" onClick={remove} disabled={pending} aria-label={`Delete ${title}`}><Trash2 size={15} /> Delete</button></div>{pending && <p className="card-action-status" role="status">Working…</p>}{error && <p className="card-action-error" role="alert">{error}</p>}</div>;
}
