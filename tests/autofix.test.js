// Fix printability: mesh repair, display base, and automatic setting changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

globalThis.THREE = THREE;
const { weld, signedVolume } = await import("../public/js/geometry/mesh-utils.js");
const { repairMesh, countBadEdges } = await import("../public/js/geometry/repair.js");
const { buildModel } = await import("../public/js/geometry/build.js");
const { sanitizeSpec } = await import("../public/js/core/spec.js");
const { analyze, evaluate } = await import("../public/js/analysis/printability.js");
const { planFixes, leftoverAdvice } = await import("../public/js/analysis/autofix.js");
const { PRESETS } = await import("../public/js/config/catalog.js");

const sphere = () => weld(new THREE.SphereGeometry(30, 48, 32));
const status = (E, id) => E.checks.find(c => c.id === id)?.l;
const check = (spec, imported = null, printer = "a1") => {
  const { mesh, textInfo } = buildModel(sanitizeSpec(spec), imported);
  const analysis = analyze(mesh);
  return { mesh, textInfo, analysis, evaluation: evaluate(analysis, { printer, material: "PLA", infill: 15, textInfo }) };
};
// Apply planFixes until nothing changes, like the button does.
function autoFix(spec, imported = null, printer = "a1") {
  let s = sanitizeSpec(spec), r = check(s, imported, printer);
  for (let i = 0; i < 3; i++) {
    const plan = planFixes({ spec: s, evaluation: r.evaluation, analysis: r.analysis, textInfo: r.textInfo, printer });
    if (!plan.actions.length) break;
    s = sanitizeSpec(plan.spec); r = check(s, imported, printer);
  }
  return { spec: s, ...r };
}

test("repair closes scattered holes", () => {
  const s = sphere(), idx = Array.from(s.idx);
  for (let k = 0; k < 40; k++) idx.splice(((k * 977) % (idx.length / 3)) * 3, 3);
  const { mesh, stats } = repairMesh({ pos: s.pos, idx: new Uint32Array(idx) });
  assert.ok(stats.before > 0);
  assert.equal(stats.after, 0);
  assert.equal(countBadEdges(mesh.idx), 0);
});

test("repair closes a large open cap", () => {
  const s = sphere(), idx = [];
  for (let i = 0; i < s.idx.length; i += 3) {
    if (Math.min(...[0, 1, 2].map(e => s.pos[s.idx[i + e] * 3 + 1])) > 25) continue;
    idx.push(s.idx[i], s.idx[i + 1], s.idx[i + 2]);
  }
  assert.equal(repairMesh({ pos: s.pos, idx: new Uint32Array(idx) }).stats.after, 0);
});

test("repair removes duplicate faces, zero-thickness sheets, debris and fins", () => {
  const s = sphere(), idx = Array.from(s.idx), pos = Array.from(s.pos);
  idx.push(...idx.slice(0, 30));                 // duplicates
  idx.push(idx[33], idx[35], idx[34]);           // reversed copy (zero-thickness)
  const b = pos.length / 3; pos.push(100, 0, 0, 101, 0, 0, 100, 1, 0); idx.push(b, b + 1, b + 2); // floating debris
  const f = pos.length / 3; pos.push(0, 80, 0); idx.push(idx[0], idx[1], f);                     // fin on an edge
  const { mesh, stats } = repairMesh({ pos: new Float32Array(pos), idx: new Uint32Array(idx) });
  assert.equal(stats.after, 0);
  assert.ok(Math.abs(Math.abs(signedVolume(mesh)) - Math.abs(signedVolume(s))) / Math.abs(signedVolume(s)) < 0.02, "shape is preserved");
});

test("a thin imported figure gets a display base and then stands", () => {
  const pole = weld(new THREE.CylinderGeometry(1.5, 1.5, 60, 24).translate(0, 30, 0));
  const spec = { template: "imported", name: "Pole", params: { height: 100, turn: 0, base: 0 } };
  assert.equal(status(check(spec, pole).evaluation, "contact"), "fail");
  const fixed = autoFix(spec, pole);
  assert.equal(fixed.spec.params.base, 1);
  assert.equal(status(fixed.evaluation, "contact"), "pass");
  assert.equal(status(fixed.evaluation, "watertight"), "pass");
  assert.ok(fixed.mesh.base && fixed.mesh.frame.bottom > 2 && fixed.mesh.frame.bottom < 3, "model sits on the base");
});

test("a vase too tall for the printer is scaled to fit", () => {
  const spec = { ...PRESETS.vase, params: { ...PRESETS.vase.params, height: 250 } };
  assert.equal(status(check(spec, null, "mini").evaluation, "fit"), "fail");
  assert.equal(status(autoFix(spec, null, "mini").evaluation, "fit"), "pass");
});

test("thin walls and a steep flare are corrected", () => {
  const spec = { template: "vessel", name: "Bowl", params: { height: 30, radiusBottom: 15, radiusTop: 90, bulge: 30, sides: 0, ribs: 0, ribDepth: 0, twist: 0, wall: 0.6, floor: 1 } };
  const before = check(spec).evaluation;
  assert.notEqual(status(before, "walls"), "pass");
  assert.notEqual(status(before, "overhang"), "pass");
  const after = autoFix(spec).evaluation;
  assert.equal(status(after, "walls"), "pass");
  assert.equal(status(after, "overhang"), "pass");
});

test("a model that already passes is left alone", () => {
  const r = check(PRESETS.planter);
  assert.equal(planFixes({ spec: sanitizeSpec(PRESETS.planter), evaluation: r.evaluation, analysis: r.analysis, textInfo: r.textInfo, printer: "a1" }).actions.length, 0);
  assert.equal(leftoverAdvice(r.evaluation).length, 0);
});
