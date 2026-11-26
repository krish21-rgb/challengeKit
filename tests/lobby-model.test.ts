import test from "node:test";
import assert from "node:assert/strict";
import { validPin, validateNickname } from "../lib/lobby/model";

test("lobby PINs require exactly six digits", () => {
  assert.equal(validPin("123456"), true);
  for (const value of ["12345", "1234567", "12 456", "ABCDEF", 123456, null]) assert.equal(validPin(value), false);
});
test("nicknames are validated without accepting control characters", () => {
  assert.equal(validateNickname("  Sam  "), null);
  for (const value of [" ", "x", "x".repeat(25), "A\nB", null]) assert.ok(validateNickname(value));
});

test("answer requests must identify a valid question and option", async () => {
  const { validAnswer } = await import("../lib/lobby/model");
  assert.equal(validAnswer({ questionIndex: 0, optionIndex: 3 }), true);
  for (const value of [null, {}, { questionIndex: -1, optionIndex: 0 }, { questionIndex: 50, optionIndex: 0 }, { questionIndex: 0, optionIndex: 4 }, { questionIndex: 0, optionIndex: 1.5 }, { questionIndex: "0", optionIndex: 0 }]) assert.equal(validAnswer(value), false);
});
