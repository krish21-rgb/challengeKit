import test from "node:test";
import assert from "node:assert/strict";
import { getSiteUrl, validateEmail, validateName, validatePassword } from "../lib/auth/validation";

test("validates email addresses and name boundaries", () => {
  assert.equal(validateEmail(" teacher@example.org "), null);
  assert.ok(validateEmail("teacher@example"));
  assert.ok(validateEmail("a@b.com".repeat(40)));
  assert.equal(validateName("  Alex  "), null);
  assert.ok(validateName("   "));
  assert.ok(validateName("a".repeat(81)));
});

test("password length boundaries are enforced", () => {
  assert.ok(validatePassword("short"));
  assert.equal(validatePassword("12345678"), null);
  assert.equal(validatePassword("a".repeat(72)), null);
  assert.ok(validatePassword("a".repeat(73)));
});

test("authentication redirect origins reject untrusted or malformed URLs", () => {
  assert.equal(getSiteUrl("https://example.com"), "https://example.com");
  assert.equal(getSiteUrl("http://localhost:3000"), "http://localhost:3000");
  for (const url of [undefined, "not a url", "http://example.com", "https://example.com/path", "https://example.com/?next=evil", "https://user:pass@example.com", "javascript:alert(1)"]) {
    assert.equal(getSiteUrl(url), null);
  }
});
