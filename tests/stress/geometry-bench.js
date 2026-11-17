// Performance test for model building and printability analysis.
// Run with: node tests/stress/geometry-bench.js
import fs from "node:fs";
import * as THREE from "three";
globalThis.THREE = THREE;
const { PRESETS } = await import("../../public/js/config/catalog.js");
const { sanitizeSpec } = await import("../../public/js/core/spec.js");
const { buildModel } = await import("../../public/js/geometry/build.js");
const { setFont } = await import("../../public/js/geometry/text.js");
const { analyze, evaluate } = await import("../../public/js/analysis/printability.js");
const { weld } = await import("../../public/js/geometry/mesh-utils.js");
setFont(JSON.parse(fs.readFileSync(new URL("../../public/assets/fonts/helvetiker_bold.typeface.json", import.meta.url))));

const time = (fn, runs = 20) => { fn(); const t = performance.now(); for (let i = 0; i < runs; i++) fn(); return (performance.now() - t) / runs; };
const settings = { printer: "a1", material: "PLA", infill: 15 };

console.log("Model build + printability analysis (average of 20 runs)\n");
console.log("Product".padEnd(22) + "Triangles".padStart(10) + "Build+check ms".padStart(16));
for (const [key, p] of Object.entries(PRESETS)) {
  const spec = sanitizeSpec({ ...p, text: { content: "HOME", size: 12, depth: 1 } });
  let tris = 0;
  const ms = time(() => { const { mesh, textInfo } = buildModel(spec); const A = analyze(mesh); evaluate(A, { ...settings, textInfo }); tris = A.tris; });
  console.log(`${(key + " + letters").padEnd(22)}${String(tris).padStart(10)}${ms.toFixed(1).padStart(16)}`);
}

// Worst case the app allows from Meshy: a ~300,000 triangle mesh.
const g = new THREE.SphereGeometry(50, 388, 388);
const mesh = weld(g);
const ms = time(() => evaluate(analyze(mesh), { ...settings, textInfo: null }), 5);
console.log(`\nLarge imported mesh: ${(mesh.idx.length / 3).toLocaleString()} triangles analyzed in ${ms.toFixed(0)} ms`);
