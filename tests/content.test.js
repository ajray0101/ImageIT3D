// Content rules: what ImageIT3D refuses to generate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPrompt } from "../public/js/config/content-rules.js";

const blocked = {
  sexual: ["a nude woman", "sexy figurine", "NSFW statue"],
  violence: ["a severed head", "bloody corpse on a table", "a noose"],
  weapons: ["a pistol", "lower receiver for an AR-15", "AR15 parts", "a ghost gun", "a dagger", "brass knuckles", "a gun"],
  hate: ["a swastika keychain", "nazi eagle"],
  drugs: ["a small bong", "crack pipe"]
};
for (const [category, prompts] of Object.entries(blocked)) {
  for (const p of prompts) {
    test(`blocks "${p}" (${category})`, () => {
      const r = checkPrompt(p);
      assert.equal(r.allowed, false);
      assert.equal(r.category, category);
    });
  }
}

const allowed = [
  "a small dog", "a tiny dog sitting", "a dragon on a rock", "a castle", "a hanging planter", "a pepper grinder",
  "a bath bomb mold", "a hot glue gun holder", "a knife block", "a sextant", "Essex county sign", "a method for sorting",
  "a sword-shaped bookmark", "a cat holding a heart", "a rocket ship"
];
for (const p of allowed) {
  test(`allows "${p}"`, () => assert.equal(checkPrompt(p).allowed, true));
}

test("simple character swaps are caught", () => {
  assert.equal(checkPrompt("n@ked figure").allowed, false);
  assert.equal(checkPrompt("p0rn").allowed, false);
});
