// Geometry, printability and pricing tests. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";

globalThis.THREE = THREE; // the app uses three.js as a browser global
const { PRESETS } = await import("../public/js/config/catalog.js");
const { sanitizeSpec } = await import("../public/js/core/spec.js");
const { buildModel } = await import("../public/js/geometry/build.js");
const { setFont } = await import("../public/js/geometry/text.js");
const { analyze, evaluate } = await import("../public/js/analysis/printability.js");
const { pricing } = await import("../public/js/analysis/pricing.js");
const { toSTL } = await import("../public/js/services/exporter.js");

setFont(JSON.parse(fs.readFileSync(new URL("../public/assets/fonts/helvetiker_bold.typeface.json", import.meta.url))));
const settings = { printer: "a1", material: "PLA", infill: 15 };

for (const [key, preset] of Object.entries(PRESETS)) {
  for (const letters of ["", "HOME 26"]) {
    test(`${key}${letters ? " with letters" : ""} is a watertight, printable solid`, () => {
      const spec = sanitizeSpec({ ...preset, text: { content: letters, size: 12, depth: 1 } });
      const { mesh, textInfo } = buildModel(spec);
      const A = analyze(mesh);
      assert.equal(A.badEdges, 0, "mesh has open edges");
      assert.ok(A.vol > 0, "volume should be positive");
      assert.ok(A.size.every(v => v > 0), "size should be positive");
      if (letters) assert.ok(textInfo && textInfo.letterH > 0, "letters should be placed");
      const E = evaluate(A, { ...settings, textInfo });
      assert.notEqual(E.checks.find(c => c.t.startsWith("Fits"))?.l, undefined);
      assert.ok(E.grams > 0 && E.hours > 0);
    });
  }
}

test("sanitizeSpec clamps out-of-range and junk values", () => {
  const s = sanitizeSpec({ template: "vessel", params: { height: 9999, wall: -5, ribs: "lots" }, text: { content: "héllo wörld this is far too long", size: 100 } });
  assert.equal(s.params.height, 250);
  assert.equal(s.params.wall, 0.6);
  assert.equal(s.params.ribs, 24); // default
  assert.equal(s.text.size, 40);
  assert.ok(s.text.content.length <= 24 && /^[\x20-\x7E]*$/.test(s.text.content));
  assert.equal(sanitizeSpec({ template: "spaceship" }).template, "vessel");
});

test("a model taller than the printer fails the fit check", () => {
  const { mesh } = buildModel(sanitizeSpec({ ...PRESETS.vase, params: { ...PRESETS.vase.params, height: 250 } }));
  const E = evaluate(analyze(mesh), { ...settings, printer: "mini" });
  assert.equal(E.level, "fail");
});

test("pricing covers cost and fees at every tier", () => {
  const { mesh } = buildModel(sanitizeSpec(PRESETS.planter));
  const E = evaluate(analyze(mesh), settings);
  for (const market of ["etsy", "ebay", "shop"]) {
    const P = pricing(E, { costs: { filament: 22, laborMin: 10, laborRate: 18, packaging: 1.5 }, market });
    for (const [, t] of P.tiers) assert.ok(t.keep > 0, `${market} tier should be profitable`);
    assert.ok(P.tiers[0][1].price <= P.tiers[1][1].price && P.tiers[1][1].price <= P.tiers[2][1].price);
  }
});

test("STL export writes one 50-byte record per triangle", () => {
  const { mesh } = buildModel(sanitizeSpec(PRESETS.tag));
  const buf = toSTL(mesh, "tag");
  const n = new DataView(buf).getUint32(80, true);
  assert.equal(n, mesh.idx.length / 3);
  assert.equal(buf.byteLength, 84 + 50 * n);
});
