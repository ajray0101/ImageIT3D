// Vessel template: vases, planters, cups, bowls, coasters, trays.
// Builds a closed solid from an outer wall, a rim, an inner wall, a floor and a base.
// Returns `info` with surface functions so raised letters can follow the wall.

export function buildVessel(p) {
  const H = p.height, wall = p.wall, floor = Math.min(Math.max(p.floor, 0.6), H - 1);
  const n = p.sides >= 3 ? Math.round(p.sides) : 0;
  const segs = n ? n * 12 : 96, rows = H < 20 ? 6 : 48;
  const tw = p.twist * Math.PI / 180, R = Math.max(p.radiusBottom, p.radiusTop);
  const ribDepth = p.ribs > 0 ? p.ribDepth : 0;

  const base = t => p.radiusBottom + (p.radiusTop - p.radiusBottom) * t + (p.bulge / 100) * R * Math.sin(Math.PI * t);
  const poly = th => {
    if (!n) return 1;
    const a = 2 * Math.PI / n, f = ((th % a) + a) % a;
    return Math.cos(Math.PI / n) / Math.cos(f - Math.PI / n);
  };
  const rib = th => (p.ribs > 0 ? p.ribDepth * Math.cos(p.ribs * th) : 0);

  const pos = [], idx = [];
  const v = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  let minWall = wall;
  const O = [], I = [];

  for (let i = 0; i <= rows; i++) {
    const t = i / rows, y = H * t, ring = [];
    for (let j = 0; j < segs; j++) {
      const th = 2 * Math.PI * j / segs, tp = th + tw * t;
      const r = Math.max(1, base(t) * poly(tp) + rib(tp));
      ring.push(v(r * Math.cos(th), y, r * Math.sin(th)));
    }
    O.push(ring);
  }
  for (let k = 0; k <= rows; k++) {
    const y = floor + (H - floor) * k / rows, t = y / H, ring = [];
    let bi = base(t) - wall;
    if (bi < 1.5) { minWall = Math.min(minWall, base(t) - 1.5); bi = 1.5; }
    for (let j = 0; j < segs; j++) {
      const th = 2 * Math.PI * j / segs, tp = th + tw * t;
      const r = Math.max(0.5, bi * poly(tp) + rib(tp));
      ring.push(v(r * Math.cos(th), y, r * Math.sin(th)));
    }
    I.push(ring);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < segs; j++) {
    const j1 = (j + 1) % segs;
    let a = O[i][j], b = O[i][j1], c = O[i + 1][j1], d = O[i + 1][j];
    idx.push(a, d, c, a, c, b);                         // outer wall
    a = I[i][j]; b = I[i][j1]; c = I[i + 1][j1]; d = I[i + 1][j];
    idx.push(a, b, c, a, c, d);                         // inner wall
  }
  const ot = O[rows], it = I[rows];
  for (let j = 0; j < segs; j++) {                      // rim
    const j1 = (j + 1) % segs;
    idx.push(ot[j], it[j], ot[j1], ot[j1], it[j], it[j1]);
  }
  const cb = v(0, 0, 0), cf = v(0, floor, 0);
  for (let j = 0; j < segs; j++) {                      // base and inside floor
    const j1 = (j + 1) % segs;
    idx.push(cb, O[0][j], O[0][j1]);
    idx.push(cf, I[0][j1], I[0][j]);
  }

  const info = {
    kind: "vessel", H, floor, wall, ribDepth,
    baseR: t => base(t),
    outer: (th, t) => { const tp = th + tw * t; return base(t) * poly(tp) + rib(tp); },
    core: (th, t) => { const tp = th + tw * t; return base(t) * poly(tp) - ribDepth; },
    floorR: Math.max(2, base(floor / H) - wall)
  };
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx), minWall: Math.min(minWall, floor), info };
}
