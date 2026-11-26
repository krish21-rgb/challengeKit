"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { QuizData } from "@/lib/quiz/model";

export function QuizPreviewDialog({ quiz, onClose }: { quiz: QuizData; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal(); }, []);
  return <dialog ref={ref} className="preview-dialog" onClose={onClose} aria-labelledby="preview-title"><div className="preview-dialog-head"><div><span className="workspace-kicker"><span /> TEACHER PREVIEW</span><h2 id="preview-title">{quiz.title || "Untitled quiz"}</h2><p>Preview only · correct answers are visible to you.</p></div><button type="button" className="icon-button" onClick={() => ref.current?.close()} aria-label="Close preview"><X size={20} /></button></div><div className="preview-dialog-body">{quiz.description && <p className="preview-description">{quiz.description}</p>}{quiz.questions.length === 0 ? <p className="preview-empty">Add a question to see it here.</p> : quiz.questions.map((q, i) => <section className="preview-question" key={q.clientId}><div className="preview-question-top"><span>QUESTION {i + 1}</span><span>{q.timeLimit} SEC · {q.points} PTS</span></div><h3>{q.text || "Your question will appear here"}</h3><div className="preview-options">{q.options.map((option, n) => <div key={n} className={q.correctIndex === n ? "preview-option correct" : "preview-option"}><span>{String.fromCharCode(65 + n)}</span>{option || "Answer option"}{q.correctIndex === n && <strong>Correct</strong>}</div>)}</div>{q.explanation && <p className="preview-explanation"><strong>Explanation:</strong> {q.explanation}</p>}</section>)}</div><div className="preview-dialog-foot"><button type="button" className="button button-dark" onClick={() => ref.current?.close()}>Back to editor</button></div></dialog>;
}
