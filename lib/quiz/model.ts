export type QuizStatus = "draft" | "published";
export type QuizQuestion = {
  clientId: string;
  text: string;
  options: string[];
  correctIndex: number | null;
  explanation: string;
  timeLimit: number;
  points: number;
};
export type QuizData = {
  title: string; description: string; subject: string; grade: string; topic: string;
  coverUrl: string; status: QuizStatus; questions: QuizQuestion[];
};
export type QuizRecord = QuizData & { id: string; updatedAt: string };

export function emptyQuiz(): QuizData {
  return { title: "", description: "", subject: "", grade: "", topic: "", coverUrl: "", status: "draft", questions: [] };
}
export function newQuestion(): QuizQuestion {
  return { clientId: crypto.randomUUID(), text: "", options: ["", "", "", ""], correctIndex: null, explanation: "", timeLimit: 30, points: 100 };
}
const text = (v: unknown, max: number, required = false): v is string => typeof v === "string" && v.length <= max && (!required || v.trim().length > 0);
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export function validateQuiz(value: unknown): string | null {
  if (!record(value)) return "Invalid quiz data.";
  if (!text(value.title, 120, true)) return "Enter a quiz title (up to 120 characters).";
  if (!text(value.description, 1000) || !text(value.subject, 80) || !text(value.grade, 80) || !text(value.topic, 120)) return "A quiz detail is too long or invalid.";
  if (!text(value.coverUrl, 2048)) return "The cover image URL is too long.";
  if (value.coverUrl) {
    try { const url = new URL(value.coverUrl); if (url.protocol !== "https:" || url.username || url.password || /\s/.test(value.coverUrl)) throw new Error(); }
    catch { return "Use a valid HTTPS cover image URL, or leave it blank."; }
  }
  if (value.status !== "draft" && value.status !== "published") return "Invalid quiz status.";
  if (!Array.isArray(value.questions) || value.questions.length > 50) return "A quiz can have at most 50 questions.";
  if (value.status === "published" && value.questions.length === 0) return "Add at least one question before publishing.";
  for (let i = 0; i < value.questions.length; i++) {
    const q = value.questions[i];
    const prefix = `Question ${i + 1}: `;
    if (!record(q) || !text(q.text, 500, true)) return `${prefix}enter a question (up to 500 characters).`;
    if (!text(q.explanation, 1000)) return `${prefix}the explanation is too long.`;
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((option: unknown) => !text(option, 250, true))) return `${prefix}fill in all four answer options.`;
    if (!Number.isInteger(q.correctIndex) || (q.correctIndex as number) < 0 || (q.correctIndex as number) > 3) return `${prefix}choose the correct answer.`;
    if (!Number.isInteger(q.timeLimit) || (q.timeLimit as number) < 5 || (q.timeLimit as number) > 300) return `${prefix}time limit must be between 5 and 300 seconds.`;
    if (!Number.isInteger(q.points) || (q.points as number) < 0 || (q.points as number) > 10000) return `${prefix}points must be between 0 and 10,000.`;
  }
  return null;
}
export function validQuizId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
