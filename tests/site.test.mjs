import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const preview = await readFile(new URL('../components/quiz-preview.tsx', import.meta.url), 'utf8');

test('landing navigation points to real sections', () => {
  for (const id of ['top', 'why', 'how', 'about']) {
    assert.match(page, new RegExp(`id="${id}"`));
    assert.match(page, new RegExp(`href="#${id}"`));
  }
});

test('phase one does not link to unimplemented product routes', () => {
  assert.doesNotMatch(page, /href="\/(login|register|join|dashboard|quizzes|play)/);
});

test('quiz artwork is explicitly identified as an illustration', () => {
  assert.match(preview, /Illustration of a future challengeKit quiz/);
  assert.match(preview, /A LITTLE PREVIEW OF WHAT’S TO COME/);
});
