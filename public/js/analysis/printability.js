// LaunchIT3D printability analysis.
// analyze(mesh)  -> raw measurements (size, volume, overhangs, open edges...)
// evaluate(...)  -> pass / warn / fail checks plus filament and time estimates
// To add a check: push another { l, t, d } object in evaluate().
import { PRINTERS, MATERIALS } from "../config/catalog.js";
import { signedVolume, bounds } from "../geometry/mesh-utils.js";

export function analyze(m) {
  const P = m.pos, X = m.idx; let area = 0, over = 0, baseA = 0;
  const { min, max } = bounds(P);
  const edges = new Map();
  for (let i = 0; i < X.length; i += 3) {
    const ia = X[i], ib = X[i + 1], ic = X[i + 2], a = ia * 3, b = ib * 3, c = ic * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz); if (!len) continue;
    const ar = len / 2; area += ar;
    const ndy = ny / len;
    const minY = Math.min(P[a + 1], P[b + 1], P[c + 1]), maxY = Math.max(P[a + 1], P[b + 1], P[c + 1]);
    const hidden = (m.embeddedFrom !== undefined && i / 3 >= m.embeddedFrom)
      || (m.supportedBelow !== undefined && maxY <= m.supportedBelow + 0.05); // sits inside the display base
    if (ndy < -0.707 && minY > 0.3 && !hidden) over += ar;      // faces steeper than 45° that are off the bed
    if (ndy < -0.99 && maxY < 0.05) baseA += ar;                // flat faces touching the bed
    for (const [p, q] of [[ia, ib], [ib, ic], [ic, ia]]) {
      const k = p < q ? p * 1e7 + q : q * 1e7 + p;
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  let badEdges = 0; for (const c of edges.values()) if (c !== 2) badEdges++;
  return {
    size: [max[0] - min[0], max[2] - min[2], max[1] - min[1]], // width, depth, height (mm)
    vol: Math.abs(signedVolume(m)), area, over, baseA, badEdges,
    tris: X.length / 3, minWall: m.minWall, imported: m.info?.kind === "imported"
  };
}

export function evaluate(A, { printer, material, infill, textInfo }) {
  const pr = PRINTERS[printer], mat = MATERIALS[material], checks = [];

  const fp = [A.size[0], A.size[1]].sort((a, b) => b - a), bed = [pr.x, pr.y].sort((a, b) => b - a);
  if (fp[0] <= bed[0] && fp[1] <= bed[1] && A.size[2] <= pr.z) {
    checks.push({ id: "fit", l: "pass", t: "Fits your printer", d: `Uses ${Math.round(fp[0])} × ${Math.round(fp[1])} mm of the ${bed[0]} × ${bed[1]} mm bed and ${Math.round(A.size[2])} of ${pr.z} mm height.` });
  } else {
    const parts = [];
    if (A.size[2] > pr.z) parts.push(`${Math.ceil(A.size[2] - pr.z)} mm too tall`);
    if (fp[0] > bed[0] || fp[1] > bed[1]) parts.push("too wide for the bed");
    checks.push({ id: "fit", l: "fail", t: `Doesn't fit the ${pr.name}`, d: `The model is ${parts.join(" and ")}. Scale it down in Design or pick a larger printer.` });
  }

  if (A.badEdges === 0) checks.push({ id: "watertight", l: "pass", t: "Watertight solid", d: `${A.tris.toLocaleString()} triangles, no holes or loose edges. Slicers will read it cleanly.` });
  else checks.push({ id: "watertight", l: "fail", t: "Mesh has holes", d: `${A.badEdges} open or doubled edges. Repair the mesh before slicing (most slicers have a "Fix model" option).` });

  const w = A.minWall;
  if (!Number.isFinite(w)) checks.push({ id: "walls", l: "warn", t: "Wall thickness not measured", d: "Imported models can have very thin parts like fingers, antennae or hair. Check them in your slicer's preview before printing." });
  else if (w >= 1.2) checks.push({ id: "walls", l: "pass", t: "Walls are thick enough", d: `Thinnest wall is ${w.toFixed(1)} mm, comfortable for a 0.4 mm nozzle.` });
  else if (w >= 0.8) checks.push({ id: "walls", l: "warn", t: "Thin walls", d: `Thinnest wall is ${w.toFixed(1)} mm. It will print but may feel fragile. 1.2 mm or more is safer.` });
  else checks.push({ id: "walls", l: "fail", t: "Walls too thin to print", d: `Thinnest wall is ${w.toFixed(1)} mm. Raise it to at least 0.8 mm, ideally 1.2 mm.` });

  if (textInfo) {
    const lh = textInfo.letterH, stroke = lh * 0.14, fit = textInfo.shrunk ? " They were shrunk to fit the space." : "";
    if (stroke >= 0.8) checks.push({ id: "letters", l: "pass", t: "Letters will print cleanly", d: `${lh.toFixed(1)} mm tall, raised ${textInfo.depth.toFixed(1)} mm.${fit}` });
    else checks.push({ id: "letters", l: "warn", t: "Letters are small", d: `At ${lh.toFixed(1)} mm tall the strokes are thinner than a 0.4 mm nozzle handles well. Use shorter text or a bigger item; 6 mm or taller prints best.${fit}` });
  }

  const of = A.area ? A.over / A.area : 0;
  if (of < 0.02) checks.push({ id: "overhang", l: "pass", t: "No supports needed", d: "Nothing hangs out steeper than 45°." });
  else if (of < 0.08) checks.push({ id: "overhang", l: "warn", t: "Small overhangs", d: `About ${Math.round(of * 100)}% of the surface overhangs past 45°. It usually prints fine; turn on supports if edges droop.` });
  else checks.push({ id: "overhang", l: "warn", t: "Needs supports", d: `About ${Math.round(of * 100)}% of the surface overhangs past 45°. ${A.imported ? "Turn on supports in your slicer; this is normal for figures and animals." : "Enable supports, or reduce the belly or lean angle."}` });

  const ratio = A.size[2] / Math.sqrt(Math.max(A.baseA, 1));
  if (A.baseA < 40) checks.push({ id: "contact", l: "fail", t: "Too little bed contact", d: "The model barely touches the bed and will likely come loose mid-print. Try tipping it over or adding a brim." });
  else if (ratio > 6) checks.push({ id: "contact", l: "warn", t: "Tall and narrow", d: "The base is small for this height. Add a brim in your slicer so it doesn't tip." });
  else checks.push({ id: "contact", l: "pass", t: "Stable on the bed", d: `${(A.baseA / 100).toFixed(1)} cm² of flat base contact.` });

  // Filament: solid shell (~1.2 mm of perimeters/skins) plus infill of the remaining volume.
  const V = A.vol / 1000, shell = Math.min(V, (A.area / 100) * 0.12);
  const grams = mat.density * (shell + (infill / 100) * (V - shell));
  const hours = grams / 14 + 0.2; // rough 0.2 mm layer throughput
  const level = checks.some(c => c.l === "fail") ? "fail" : checks.some(c => c.l === "warn") ? "warn" : "pass";
  return { checks, grams, hours, level };
}

export const VERDICTS = {
  pass: ["Ready to print", "All checks passed"],
  warn: ["Printable with care", "See Printability for notes"],
  fail: ["Not ready to print", "See Printability to fix"]
};
