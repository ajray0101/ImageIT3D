// Display base: a flat round plate under an imported model so it stands firmly on the bed.
// The model sinks slightly into the plate; slicers merge the overlap when printing.
import { weld, orient, mergeMesh, bounds } from "../mesh-utils.js";

export const BASE_THICKNESS = 3;
const SINK = 0.4;

export function addBase(m) {
  const { min, max } = bounds(m.pos), H = max[1] - min[1];
  // Center the plate under the part that touches the bed (feet, bottom), not the whole outline.
  const slice = Math.max(1, H * 0.03);
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < m.pos.length; i += 3) if (m.pos[i + 1] <= min[1] + slice) { cx += m.pos[i]; cz += m.pos[i + 2]; n++; }
  cx /= n; cz /= n;
  let lowR = 0;
  for (let i = 0; i < m.pos.length; i += 3) if (m.pos[i + 1] <= min[1] + slice) lowR = Math.max(lowR, Math.hypot(m.pos[i] - cx, m.pos[i + 2] - cz));
  const radius = Math.max(lowR + 4, H * 0.22, 12);

  const lift = BASE_THICKNESS - SINK - min[1];
  const pos = new Float32Array(m.pos);
  for (let i = 1; i < pos.length; i += 3) pos[i] += lift;

  const g = new THREE.CylinderGeometry(radius, radius, BASE_THICKNESS, 72);
  g.translate(cx, BASE_THICKNESS / 2, cz);
  const plate = orient(weld(g)); g.dispose();

  const merged = mergeMesh({ ...m, pos }, plate);
  merged.supportedBelow = BASE_THICKNESS; // faces inside the plate aren't overhangs
  merged.modelBox = { min: [min[0], min[1] + lift, min[2]], max: [max[0], max[1] + lift, max[2]] };
  merged.base = { radius, thickness: BASE_THICKNESS, cx, cz };
  return merged;
}
