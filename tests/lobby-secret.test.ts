import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeServerKey } from "../lib/lobby/secret";
test("only secret or legacy service-role key shapes are accepted", () => {
  const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assert.equal(looksLikeServerKey("sb_secret_example_key_1234567890"), true);
  assert.equal(looksLikeServerKey(jwt("service_role")), true);
  assert.equal(looksLikeServerKey(jwt("anon")), false);
  assert.equal(looksLikeServerKey("sb_publishable_example_key_12345"), false);
  assert.equal(looksLikeServerKey("bad"), false);
});
