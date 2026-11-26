"use client";
import { Check, Clock3, Sparkles } from "lucide-react";
import type { LobbyState } from "@/lib/lobby/model";

type Props = { lobby: LobbyState; role: "host" | "player"; remaining: number; pending: boolean; onAnswer: (index: number) => void };
export function GamePanel({ lobby, role, remaining, pending, onAnswer }: Props) {
  const q = lobby.question;
  if (!q) return <div className="game-panel"><p>Waiting for the game state…</p></div>;
  const reveal = lobby.status === "reveal";
  const selected = q.selectedIndex != null;
  const canSelect = role === "player" && !reveal && q.canAnswer && remaining > 0 && !selected && !pending;
  return <section className="game-panel" aria-labelledby="game-question-title"><div className="game-question-kicker"><span><Sparkles size={15} /> QUESTION {q.index + 1} OF {q.total}</span><span><Clock3 size={15} /> {reveal ? "ANSWERS REVEALED" : `${remaining}s LEFT`}</span></div><h2 id="game-question-title">{q.text}</h2><p className="game-question-meta">{q.points} points · {reveal ? "Answer reveal" : `${q.answerCount} ${q.answerCount === 1 ? "answer" : "answers"} received`}</p><div className="game-options">{q.options.map((option, i) => {
    const correct = reveal && q.correctIndex === i; const chosen = role === "player" && q.selectedIndex === i;
    const className = `game-option${correct ? " correct" : ""}${chosen ? " chosen" : ""}${reveal && chosen && !correct ? " incorrect" : ""}`;
    if (role === "host") return <div className={className} key={i}><span>{String.fromCharCode(65 + i)}</span><strong>{option}</strong>{correct && <Check size={17} />}</div>;
    return <button type="button" className={className} key={i} onClick={() => onAnswer(i)} disabled={!canSelect} aria-label={`Answer ${String.fromCharCode(65 + i)}: ${option}`}><span>{String.fromCharCode(65 + i)}</span><strong>{option}</strong>{correct && <Check size={17} />}</button>;
  })}</div>{role === "player" && !reveal && <p className="game-answer-note" role="status">{selected ? "Answer locked in. Wait for your teacher to reveal it." : q.canAnswer && remaining > 0 ? "Choose one answer. You can only submit once." : "Time’s up. Wait for the answer reveal."}</p>}{reveal && role === "player" && <div className="answer-feedback" role="status"><strong>{!selected ? "No answer submitted this time." : q.selectedIndex === q.correctIndex ? `Correct! +${q.points} points` : "Not quite—keep going!"}</strong>{q.explanation && <p>{q.explanation}</p>}</div>}{reveal && role === "host" && q.explanation && <p className="game-explanation"><strong>Explanation:</strong> {q.explanation}</p>}</section>;
}
