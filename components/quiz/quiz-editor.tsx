"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, Plus, Save, Trash2 } from "lucide-react";
import { saveQuiz } from "@/app/quizzes/actions";
import { emptyQuiz, newQuestion, validateQuiz, type QuizData, type QuizQuestion, type QuizRecord, type QuizStatus } from "@/lib/quiz/model";
import { QuizPreviewDialog } from "./quiz-preview-dialog";

export function QuizEditor({ initial }: { initial?: QuizRecord }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData>(initial ?? emptyQuiz());
  const [id, setId] = useState(initial?.id ?? null);
  const [updatedAt, setUpdatedAt] = useState(initial?.updatedAt ?? null);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [pending, startTransition] = useTransition();
  const closePreview = useCallback(() => setPreview(false), []);
  const current = quiz.questions[selected];

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); } }
    function checkLink(event: MouseEvent) {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (link && link.target !== "_blank" && link.href !== location.href && !window.confirm("You have unsaved changes. Leave without saving?")) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn); document.addEventListener("click", checkLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", checkLink, true); };
  }, [dirty]);

  function change(patch: Partial<QuizData>) { setQuiz(q => ({ ...q, ...patch })); setDirty(true); setMessage(null); }
  function updateQuestion(patch: Partial<QuizQuestion>) { change({ questions: quiz.questions.map((q, i) => i === selected ? { ...q, ...patch } : q) }); }
  function addQuestion() { if (quiz.questions.length >= 50) return; change({ questions: [...quiz.questions, newQuestion()] }); setSelected(quiz.questions.length); }
  function duplicateQuestion() { if (!current || quiz.questions.length >= 50) return; const items = [...quiz.questions]; items.splice(selected + 1, 0, { ...current, clientId: crypto.randomUUID(), options: [...current.options] }); change({ questions: items }); setSelected(selected + 1); }
  function removeQuestion() { if (!current || !window.confirm("Remove this question?")) return; const items = quiz.questions.filter((_, i) => i !== selected); change({ questions: items }); setSelected(Math.max(0, Math.min(selected, items.length - 1))); }
  function moveQuestion(direction: -1 | 1) { const target = selected + direction; if (target < 0 || target >= quiz.questions.length) return; const items = [...quiz.questions]; [items[selected], items[target]] = [items[target], items[selected]]; change({ questions: items }); setSelected(target); }
  function submit(status: QuizStatus) {
    const payload = { ...quiz, status };
    const invalid = validateQuiz(payload);
    if (invalid) { setMessage({ type: "error", text: invalid }); return; }
    if (status === "draft" && quiz.status === "published" && !window.confirm("Saving as a draft will unpublish this quiz. Continue?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveQuiz(id, updatedAt, payload);
        if (!result.ok || !result.id || !result.updatedAt) { setMessage({ type: "error", text: result.error || "Could not save the quiz." }); return; }
        setQuiz(payload); setId(result.id); setUpdatedAt(result.updatedAt); setDirty(false);
        setMessage({ type: "success", text: status === "published" ? "Quiz published successfully." : "Draft saved successfully." });
        if (!id) router.replace(`/quizzes/${result.id}`);
      } catch { setMessage({ type: "error", text: "Could not save the quiz. Please check your connection and try again." }); }
    });
  }
  return <div className="editor-page"><div className="editor-topline"><Link className="back-to-quizzes" href="/quizzes"><ArrowLeft size={15} /> My quizzes</Link><span className={`quiz-status ${quiz.status}`}>{quiz.status}</span></div><div className="editor-heading"><div><div className="workspace-kicker"><span /> QUIZ BUILDER</div><h1>{id ? "Edit your quiz" : "Create a quiz"}<span className="accent-dot">.</span></h1><p className="workspace-lead">Every great challenge starts with a question.</p></div><button type="button" className="button button-outline" onClick={() => setPreview(true)}><Eye size={17} /> Preview</button></div>
    {message && <p className={`form-notice ${message.type === "error" ? "form-error" : "form-success"} editor-notice`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
    <fieldset disabled={pending} className="editor-fieldset"><div className="quiz-details-card"><div className="editor-card-title"><div><h2>Quiz details</h2><p>Give your challenge a name and a little context.</p></div><span>01</span></div><div className="editor-fields"><label className="field-full">Quiz title <span className="required">*</span><input value={quiz.title} maxLength={120} onChange={e => change({ title: e.target.value })} placeholder="e.g. A trip through the solar system" /></label><label className="field-full">Description <span className="optional">OPTIONAL</span><textarea value={quiz.description} maxLength={1000} onChange={e => change({ description: e.target.value })} placeholder="What will learners explore?" rows={3} /></label><label>Subject<input value={quiz.subject} maxLength={80} onChange={e => change({ subject: e.target.value })} placeholder="e.g. Science" /></label><label>Grade<input value={quiz.grade} maxLength={80} onChange={e => change({ grade: e.target.value })} placeholder="e.g. Grade 5" /></label><label>Topic<input value={quiz.topic} maxLength={120} onChange={e => change({ topic: e.target.value })} placeholder="e.g. The solar system" /></label><label>Cover image URL <span className="optional">OPTIONAL</span><input value={quiz.coverUrl} maxLength={2048} onChange={e => change({ coverUrl: e.target.value })} placeholder="https://..." type="url" /></label></div><p className="field-help editor-help">Cover images use a public HTTPS link for now; image uploads are coming later.</p></div>
    <div className="questions-title"><div><div className="workspace-kicker"><span /> BUILD YOUR CHALLENGE</div><h2>Your questions <span>{quiz.questions.length}/50</span></h2><p>Four choices, one correct answer, lots of curiosity.</p></div><button type="button" className="button button-outline" onClick={addQuestion} disabled={quiz.questions.length >= 50}><Plus size={17} /> Add question</button></div>
    {quiz.questions.length === 0 ? <div className="question-empty"><span>✳</span><h3>Start with a little curiosity.</h3><p>Add your first question, or save this quiz as a draft and come back later.</p><button type="button" className="button button-dark" onClick={addQuestion}><Plus size={16} /> Add a question</button></div> : <div className="question-layout"><div className="question-list" aria-label="Questions">{quiz.questions.map((q, i) => <button type="button" key={q.clientId} onClick={() => setSelected(i)} className={i === selected ? "question-tab active" : "question-tab"} aria-current={i === selected ? "true" : undefined}><span>{String(i + 1).padStart(2, "0")}</span><strong>{q.text || "Untitled question"}</strong></button>)}<button type="button" className="question-add" onClick={addQuestion} disabled={quiz.questions.length >= 50}><Plus size={15} /> Add question</button></div>{current && <section className="question-editor"><div className="question-editor-head"><div><span>QUESTION {String(selected + 1).padStart(2, "0")}</span><h3>Let’s make them think.</h3></div><div className="question-tools"><button type="button" className="icon-button" onClick={() => moveQuestion(-1)} disabled={selected === 0} aria-label="Move question up"><ArrowUp size={17} /></button><button type="button" className="icon-button" onClick={() => moveQuestion(1)} disabled={selected === quiz.questions.length - 1} aria-label="Move question down"><ArrowDown size={17} /></button><button type="button" className="icon-button" onClick={duplicateQuestion} disabled={quiz.questions.length >= 50} aria-label="Duplicate question"><Copy size={17} /></button><button type="button" className="icon-button danger" onClick={removeQuestion} aria-label="Delete question"><Trash2 size={17} /></button></div></div><div className="editor-fields"><label className="field-full">Your question <span className="required">*</span><textarea value={current.text} maxLength={500} onChange={e => updateQuestion({ text: e.target.value })} rows={3} placeholder="What would you like to ask?" /></label><div className="field-full answer-label">Answer options <span>SELECT THE CORRECT ANSWER</span></div>{current.options.map((option, n) => <div className="answer-field" key={n}><label className="answer-radio"><input type="radio" name={`correct-${current.clientId}`} checked={current.correctIndex === n} onChange={() => updateQuestion({ correctIndex: n })} aria-label={`Mark option ${String.fromCharCode(65 + n)} as correct`} /><span>{String.fromCharCode(65 + n)}</span></label><input aria-label={`Answer option ${String.fromCharCode(65 + n)}`} value={option} maxLength={250} onChange={e => { const options = [...current.options]; options[n] = e.target.value; updateQuestion({ options }); }} placeholder={`Answer ${String.fromCharCode(65 + n)}`} /></div>)}<label className="field-full">Explanation <span className="optional">OPTIONAL</span><textarea value={current.explanation} maxLength={1000} onChange={e => updateQuestion({ explanation: e.target.value })} rows={2} placeholder="Help learners understand the answer." /></label><label>Time limit (seconds)<input type="number" min={5} max={300} value={current.timeLimit} onChange={e => updateQuestion({ timeLimit: e.target.value === "" ? 0 : Number(e.target.value) })} /></label><label>Points<input type="number" min={0} max={10000} value={current.points} onChange={e => updateQuestion({ points: e.target.value === "" ? -1 : Number(e.target.value) })} /></label></div></section>}</div>}
    <div className="editor-save-bar"><div><strong>{dirty ? "You have unsaved changes" : id ? "All changes saved" : "Ready when you are"}</strong><p>Drafts can be saved without questions. Added questions must be complete.</p></div><div><button type="button" className="button button-outline" onClick={() => submit("draft")}><Save size={16} /> Save draft</button><button type="button" className="button button-dark" onClick={() => submit("published")}><Check size={16} /> {pending ? "Saving…" : quiz.status === "published" ? "Save published" : "Publish quiz"}</button></div></div></fieldset>{preview && <QuizPreviewDialog quiz={quiz} onClose={closePreview} />}</div>;
}
