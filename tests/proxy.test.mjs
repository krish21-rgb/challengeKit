import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public homepage does not depend on session refresh, while account routes do', async () => {
  const source = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');
  const matcher = source.match(/matcher: \[([^\]]+)\]/)?.[1];
  assert.ok(matcher);
  for (const path of ['/login/:path*', '/register/:path*', '/dashboard/:path*', '/settings/:path*', '/quizzes/:path*', '/host/:path*', '/api/lobby/host/:path*', '/auth/:path*']) {
    assert.ok(matcher.includes(`"${path}"`), `${path} is missing`);
  }
  assert.ok(!matcher.includes('"/"'));
});
