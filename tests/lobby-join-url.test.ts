import test from "node:test";
import assert from "node:assert/strict";
import { getJoinUrl } from "../lib/lobby/join-url";

test("student join link uses only a validated configured site origin", () => {
  assert.equal(getJoinUrl("https://challengekit.example/"), "https://challengekit.example/join");
  assert.equal(getJoinUrl("http://localhost:3000"), "http://localhost:3000/join");
  for (const value of [undefined, "https://example.com/preview", "https://example.com/?x=1", "javascript:alert(1)", "http://example.com", "https://user:pass@example.com"]) {
    assert.equal(getJoinUrl(value), null);
  }
});
