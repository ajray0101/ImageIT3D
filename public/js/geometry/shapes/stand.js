// Stand template: a phone or tablet stand extruded from a side profile.
// Built with the front facing -X; build.js turns it to face the camera afterwards.
import { weld } from "../mesh-utils.js";

export function buildStand(p) {
  const a = p.angle * Math.PI / 180, t = p.thickness, L = p.height, h = p.lip;
  const s0 = t + p.phoneGap, bb = s0 + t / Math.sin(a), Lc = L * Math.cos(a), Ls = L * Math.sin(a);
  const D = bb + Lc + 6;
  const pts = [[0, 0], [D, 0], [D, t], [bb, t], [bb + Lc, t + Ls], [s0 + Lc, t + Ls], [s0, t], [t, t], [t, t + h], [0, t + h]];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: p.width, bevelEnabled: false });
  const m = weld(g); g.dispose();
  return Object.assign(m, { minWall: t, info: { kind: "stand" } });
}
