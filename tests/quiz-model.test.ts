import test from "node:test";
import assert from "node:assert/strict";
import { emptyQuiz, validateQuiz, validQuizId, type QuizData, type QuizQuestion } from "../lib/quiz/model";

const question: QuizQuestion = { clientId: "one", text: "What is water?", options: ["H2O", "Air", "Salt", "Fire"], correctIndex: 0, explanation: "", timeLimit: 30, points: 100 };
const quiz: QuizData = { ...emptyQuiz(), title: "Science", questions: [question] };
test("a draft may be empty, a published quiz may not", () => {
  assert.equal(validateQuiz({ ...emptyQuiz(), title: "Draft" }), null);
  assert.match(validateQuiz({ ...emptyQuiz(), title: "Draft", status: "published" }) ?? "", /at least one/);
  assert.equal(validateQuiz({ ...quiz, status: "published" }), null);
});
test("each question requires four answers, a correct answer, and valid settings", () => {
  assert.match(validateQuiz({ ...quiz, questions: [{ ...question, options: ["one"] }] }) ?? "", /four/);
  assert.match(validateQuiz({ ...quiz, questions: [{ ...question, correctIndex: null }] }) ?? "", /correct answer/);
  assert.match(validateQuiz({ ...quiz, questions: [{ ...question, timeLimit: 4 }] }) ?? "", /time limit/);
  assert.match(validateQuiz({ ...quiz, questions: [{ ...question, points: -1 }] }) ?? "", /points/);
  assert.match(validateQuiz({ ...quiz, questions: [{ ...question, text: " " }] }) ?? "", /enter a question/);
});
test("quiz inputs and cover URLs are validated", () => {
  assert.ok(validateQuiz({ ...quiz, title: " " }));
  assert.ok(validateQuiz({ ...quiz, questions: new Array(51).fill(question) }));
  assert.ok(validateQuiz({ ...quiz, coverUrl: "javascript:alert(1)" }));
  assert.ok(validateQuiz({ ...quiz, coverUrl: "http://example.org/image.png" }));
  assert.equal(validateQuiz({ ...quiz, coverUrl: "https://example.org/image.png" }), null);
  assert.equal(validQuizId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(validQuizId("not-an-id"), false);
});
