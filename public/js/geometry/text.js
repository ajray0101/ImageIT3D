// Raised letters. Builds text with three.js, fits it to the right face of the
// item, and maps it onto that face. Letters are a separate shell that sinks
// slightly into the item; slicers merge overlapping shells when printing.
import { weld, orient } from "./mesh-utils.js";

let FONT = null;
export function setFont(json) { FONT = new THREE.Font(json); }
export async function loadFont(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Font failed to load");
  setFont(await r.json());
}
export const hasFont = () => Boolean(FONT);

// Where letters go for each template (shown in the UI).
export function textPlacement(spec) {
  if (spec.template === "imported") return null;
  if (spec.template === "tag") return "Raised on the top of the tag, beside the key ring hole.";
  if (spec.template === "stand") return "Raised on the front lip.";
  return spec.params.height < 20 ? "Raised on the inside floor." : "Raised on the front of the wall.";
}

export function placeText(spec, base) {
  const tx = spec.text;
  if (!FONT || !tx || !tx.content.trim() || spec.template === "imported") return null;
  const sink = 0.3, p = spec.params, info = base.info;
  const tall = spec.template === "vessel" && info.H >= 20;
  const extra = tall ? 2 * info.ribDepth : 0;

  const g = new THREE.TextGeometry(tx.content, { font: FONT, size: tx.size, height: tx.depth + sink + extra, curveSegments: 6, bevelEnabled: false });
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;

  let availW, availH, map;
  if (spec.template === "tag") {
    const hr = Math.min(p.hole, p.width / 2 - 3), x0 = -p.length / 2 + 2 * hr + 5.5, x1 = p.length / 2 - 2.5, cx = (x0 + x1) / 2;
    availW = x1 - x0; availH = p.width - 5;
    map = (x, y, z) => [x + cx, p.thickness - sink + z, -y];
  } else if (spec.template === "stand") {
    const face = p.thickness + p.lip;
    availW = p.width - 6; availH = face - 3;
    map = (x, y, z) => [sink - z, y + face / 2, x + p.width / 2];
  } else if (!tall) {
    availW = 1.5 * info.floorR; availH = 0.9 * info.floorR;
    map = (x, y, z) => [x, info.floor - sink + z, -y];
  } else {
    availW = Math.PI * info.baseR(0.5) * 0.8; availH = 0.55 * info.H;
    map = (x, y, z) => {
      const yy = y + info.H * 0.5, t = yy / info.H, th = Math.PI / 2 - x / info.baseR(t);
      const r = Math.max(info.core(th, t) - sink, info.outer(th, t) - info.wall * 0.6) + z;
      return [r * Math.cos(th), yy, r * Math.sin(th)];
    };
  }

  const s = Math.max(0.05, Math.min(1, availW / w, availH / h)); // shrink to fit
  g.scale(s, s, 1);
  const m = weld(g); g.dispose();
  for (let i = 0; i < m.pos.length; i += 3) {
    const v = map(m.pos[i], m.pos[i + 1], m.pos[i + 2]);
    m.pos[i] = v[0]; m.pos[i + 1] = v[1]; m.pos[i + 2] = v[2];
  }
  orient(m);
  return Object.assign(m, {
    letterH: tx.size * s, depth: tx.depth, shrunk: s < 0.999,
    flat: spec.template === "tag" || (spec.template === "vessel" && !tall) // letter undersides are hidden inside the item
  });
}
