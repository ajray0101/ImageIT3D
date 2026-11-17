// "Fix printability": turn failed or warned checks into concrete changes to the spec.
// Pure functions (no DOM), so they can be unit tested. Mesh repair lives in geometry/repair.js.
//
// planFixes()   -> { spec, actions[] }  what to change and a plain-language note for each change
// leftoverAdvice() -> notes for anything still not passing that the app can't fix itself
import { PRINTERS } from "../config/catalog.js";
import { deepCopy } from "../core/utils.js";

const MIN_WALL = 1.2;     // comfortable for a 0.4 mm nozzle
const MIN_LETTER = 6;     // mm; smaller letters lose detail

export function planFixes({ spec, evaluation, analysis, textInfo, printer }) {
  const s = deepCopy(spec), p = s.params, actions = [];
  const pr = PRINTERS[printer];
  const issue = id => evaluation.checks.some(c => c.id === id && c.l !== "pass");
  const failed = id => evaluation.checks.some(c => c.id === id && c.l === "fail");

  // Can't stand up: imported models get a display base; tall thin vessels get a wider bottom.
  if (issue("contact")) {
    if (s.template === "imported" && !p.base) {
      p.base = 1;
      actions.push("Added a flat display base so it stands firmly on the bed.");
    } else if (s.template === "vessel" && p.radiusBottom < p.height / 10) {
      p.radiusBottom = Math.ceil(p.height / 10);
      actions.push("Widened the bottom so it won't tip over while printing.");
    }
  }

  // Too big: scale everything down evenly so it keeps its proportions.
  if (failed("fit")) {
    const [w, d, h] = analysis.size;
    const factor = Math.min(1, (pr.z - 2) / h, (Math.min(pr.x, pr.y) - 4) / Math.max(w, d));
    if (factor < 1) {
      const scaleKeys = { vessel: ["height", "radiusBottom", "radiusTop"], tag: ["length", "width"], stand: ["width", "height"], imported: ["height"] }[s.template];
      for (const k of scaleKeys) p[k] = Math.floor(p[k] * factor * 0.98);
      actions.push(`Scaled it to ${Math.round(factor * 98)}% of its size so it fits the ${pr.name}.`);
    }
  }

  // Thin walls (built-in shapes only; imported walls can't be measured yet).
  if (issue("walls") && s.template !== "imported") {
    if (s.template === "vessel") { p.wall = Math.max(p.wall, MIN_WALL); p.floor = Math.max(p.floor, MIN_WALL); }
    if (s.template === "tag") p.thickness = Math.max(p.thickness, MIN_WALL);
    if (s.template === "stand") p.thickness = Math.max(p.thickness, 2);
    actions.push(`Thickened the walls to at least ${MIN_WALL} mm.`);
  }

  // Overhangs on built-in shapes: soften the shape features that cause them.
  if (issue("overhang")) {
    if (s.template === "vessel") {
      // The wall leans out most at the bottom: slope = flare + belly. Keep it under ~40° (0.85).
      const MAX_SLOPE = 0.85, before = [p.radiusTop, p.bulge];
      if ((p.radiusTop - p.radiusBottom) / p.height > MAX_SLOPE) { p.radiusTop = Math.floor(p.radiusBottom + p.height * MAX_SLOPE); p.bulge = 0; }
      else {
        const R = Math.max(p.radiusBottom, p.radiusTop), room = MAX_SLOPE - (p.radiusTop - p.radiusBottom) / p.height;
        p.bulge = Math.min(p.bulge, Math.max(0, Math.floor(room * p.height / (R * Math.PI) * 100)));
      }
      if (p.radiusTop !== before[0] || p.bulge !== before[1]) actions.push("Reduced the belly and flare so it prints without supports.");
    } else if (s.template === "stand" && p.angle < 55) {
      p.angle = 55;
      actions.push("Raised the lean angle so the back support prints without supports.");
    }
  }

  // Small letters: make them bigger if there's room (if they were shrunk to fit, there isn't).
  if (issue("letters") && textInfo && !textInfo.shrunk && s.text.size < MIN_LETTER) {
    s.text.size = MIN_LETTER;
    actions.push(`Made the letters ${MIN_LETTER} mm tall so they print cleanly.`);
  }

  return { spec: s, actions };
}

const ADVICE = {
  fit: "Still too big for this printer. Choose a larger printer on this tab.",
  watertight: "Some holes couldn't be closed automatically. Use your slicer's Fix model or Repair option.",
  walls: "Wall thickness can't be measured on imported models. Check thin parts in your slicer's preview.",
  overhang: "Turn on supports in your slicer. This is normal for figures, animals and other detailed models.",
  contact: "Add a brim in your slicer so it holds onto the bed.",
  letters: "The letters are too small for the space. Use shorter text or make the item bigger."
};

export function leftoverAdvice(evaluation) {
  return evaluation.checks.filter(c => c.l !== "pass").map(c => ({ level: c.l, title: c.t, advice: ADVICE[c.id] || c.d }));
}
