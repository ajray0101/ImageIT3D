// Mesh format used everywhere in the app:
//   { pos: Float32Array [x,y,z,...], idx: Uint32Array [a,b,c,...] }
// Units are millimeters, Y is up (three.js convention). STL export converts to Z-up.

// Merge duplicate vertices so triangles share edges (needed for the watertight check).
export function weld(geo) {
  const a = geo.getAttribute("position"), map = new Map(), pos = [], remap = [];
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const k = Math.round(x * 1e4) + "," + Math.round(y * 1e4) + "," + Math.round(z * 1e4);
    let id = map.get(k);
    if (id === undefined) { id = pos.length / 3; pos.push(x, y, z); map.set(k, id); }
    remap.push(id);
  }
  const src = geo.index ? Array.from(geo.index.array) : remap.map((_, i) => i), idx = [];
  for (let i = 0; i < src.length; i += 3) {
    const p = remap[src[i]], q = remap[src[i + 1]], r = remap[src[i + 2]];
    if (p !== q && q !== r && p !== r) idx.push(p, q, r);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

export function signedVolume(m) {
  const P = m.pos, X = m.idx; let v = 0;
  for (let i = 0; i < X.length; i += 3) {
    const a = X[i] * 3, b = X[i + 1] * 3, c = X[i + 2] * 3;
    v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1])
       - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c])
       + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
  }
  return v / 6;
}

// Make triangles face outward (positive volume).
export function orient(m) {
  if (signedVolume(m) < 0) {
    for (let i = 0; i < m.idx.length; i += 3) { const t = m.idx[i + 1]; m.idx[i + 1] = m.idx[i + 2]; m.idx[i + 2] = t; }
  }
  return m;
}

export function mergeMesh(a, b) {
  const pos = new Float32Array(a.pos.length + b.pos.length); pos.set(a.pos); pos.set(b.pos, a.pos.length);
  const off = a.pos.length / 3, idx = new Uint32Array(a.idx.length + b.idx.length); idx.set(a.idx);
  for (let i = 0; i < b.idx.length; i++) idx[a.idx.length + i] = b.idx[i] + off;
  return Object.assign({}, a, { pos, idx });
}

export function bounds(pos) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]);
  }
  return { min, max };
}

// Sit the model on the bed (y = 0) and center it in X and Z.
export function groundAndCenter(m) {
  const { min, max } = bounds(m.pos);
  const off = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2];
  for (let i = 0; i < m.pos.length; i += 3) for (let k = 0; k < 3; k++) m.pos[i + k] += off[k];
  m.offset = off;
  return m;
}
