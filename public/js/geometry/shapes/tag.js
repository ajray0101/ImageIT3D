// Tag template: a flat rounded rectangle with a key ring hole.
import { weld } from "../mesh-utils.js";

function roundedRect(s, x, y, w, h, r) {
  if (r < 0.05) { s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.lineTo(x, y); return; }
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
}

export function buildTag(p) {
  const L = p.length, W = p.width, r = Math.min(p.corner, W / 2 - 0.5, L / 2 - 0.5);
  const hr = Math.min(p.hole, W / 2 - 3);
  const s = new THREE.Shape(); roundedRect(s, -L / 2, -W / 2, L, W, r);
  const hole = new THREE.Path(); hole.absarc(-L / 2 + hr + 3.5, 0, hr, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: p.thickness, bevelEnabled: false, curveSegments: 20 });
  g.rotateX(-Math.PI / 2);
  const m = weld(g); g.dispose();
  return Object.assign(m, { minWall: Math.min(p.thickness, 3.5), info: { kind: "tag" } });
}
