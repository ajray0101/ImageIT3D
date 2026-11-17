// Chat helpers: turning requests into Meshy descriptions and product names.
import { test } from "node:test";
import assert from "node:assert/strict";
const { cleanRequest } = await import("../public/js/services/assistant.js");
const { nameFromPrompt } = await import("../public/js/ui/design-import.js");

test("cleanRequest strips request phrasing", () => {
  assert.equal(cleanRequest("Create a small dog"), "a small dog");
  assert.equal(cleanRequest("I want a tiny dog"), "a tiny dog");
  assert.equal(cleanRequest("Can you make me a dragon please"), "a dragon");
});

test("nameFromPrompt gives a short product name", () => {
  assert.equal(nameFromPrompt("a Mini Snowman that is the color white with Black coal eyes"), "Mini Snowman");
  assert.equal(nameFromPrompt("a small dog"), "Small Dog");
  assert.equal(nameFromPrompt("a fox, curled up"), "Fox");
  assert.equal(nameFromPrompt("???"), "Meshy Model");
});
