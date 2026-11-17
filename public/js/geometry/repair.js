// Mesh repair for imported and AI-generated models.
// Goal: every edge shared by exactly two triangles (a watertight solid slicers can read).
//
// Steps:
//   1. Drop zero-area triangles and exact duplicates (two copies facing opposite ways
//      are a zero-thickness sheet, so both go).
//   2. Drop small floating pieces ("debris") that AI generators often leave behind.
//   3. Remove triangles on edges shared by 3+ triangles (non-manifold); this turns them
//      into ordinary holes.
//   4. Fill every hole by walking its boundary loop and fanning triangles to its center.
// Repeats a few times, since filling can expose new problems.

const edgeKey = (a, b) => (a < b ? a * 1e7 + b : b * 1e7 + a);

function countEdges(idx) {
  const edges = new Map();
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    for (const k of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) edges.set(k, (edges.get(k) || 0) + 1);
  }
  return edges;
}

export function countBadEdges(idx) {
  let bad = 0;
  for (const n of countEdges(idx).values()) if (n !== 2) bad++;
  return bad;
}

function triArea2(P, a, b, c) {
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}

// 1. Zero-area and duplicate triangles.
function dedupe(P, idx, stats) {
  const seen = new Map(); // sorted key -> list of triangle starts
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (a === b || b === c || a === c || triArea2(P, a, b, c) < 1e-12) { stats.removed++; continue; }
    const k = [a, b, c].sort((x, y) => x - y).join(",");
    (seen.get(k) || seen.set(k, []).get(k)).push(i);
  }
  const out = [];
  for (const list of seen.values()) {
    if (list.length === 1) { const i = list[0]; out.push(idx[i], idx[i + 1], idx[i + 2]); continue; }
    // Same three corners more than once: keep one only if they all face the same way.
    const sig = i => { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; const m = Math.min(a, b, c); return m === a ? [a, b, c] : m === b ? [b, c, a] : [c, a, b]; };
    const first = sig(list[0]).join(",");
    const sameWay = list.every(i => sig(i).join(",") === first);
    if (sameWay) { const i = list[0]; out.push(idx[i], idx[i + 1], idx[i + 2]); stats.removed += list.length - 1; }
    else stats.removed += list.length;
  }
  return out;
}

// 2. Connected pieces; drop the ones that are tiny compared with the largest.
function dropDebris(idx, stats) {
  const tris = idx.length / 3;
  if (tris < 4) return idx;
  const parent = Array.from({ length: tris }, (_, i) => i);
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const owner = new Map();
  for (let t = 0; t < tris; t++) {
    for (let e = 0; e < 3; e++) {
      const k = edgeKey(idx[t * 3 + e], idx[t * 3 + (e + 1) % 3]);
      if (owner.has(k)) { const r1 = find(owner.get(k)), r2 = find(t); if (r1 !== r2) parent[r1] = r2; }
      else owner.set(k, t);
    }
  }
  const size = new Map();
  for (let t = 0; t < tris; t++) { const r = find(t); size.set(r, (size.get(r) || 0) + 1); }
  const largest = Math.max(...size.values());
  const keep = r => size.get(r) >= Math.max(8, largest * 0.01); // pieces under 1% of the main body are debris
  const out = [];
  for (let t = 0; t < tris; t++) {
    if (keep(find(t))) out.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
    else { stats.debris++; }
  }
  return out;
}

// 3. Triangles touching an edge used 3+ times.
function dropNonManifold(idx, stats) {
  const edges = countEdges(idx), out = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (edges.get(edgeKey(a, b)) > 2 || edges.get(edgeKey(b, c)) > 2 || edges.get(edgeKey(c, a)) > 2) { stats.removed++; continue; }
    out.push(a, b, c);
  }
  return out;
}

// 4. Fill holes. A boundary edge a->b (used once) means the hole runs b->a, so the
//    new triangles face the same way as their neighbors.
function fillHoles(pos, idx, stats) {
  const edges = countEdges(idx), next = new Map();
  for (let i = 0; i < idx.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = idx[i + e], b = idx[i + (e + 1) % 3];
      if (edges.get(edgeKey(a, b)) === 1) {
        if (!next.has(b)) next.set(b, []);
        next.get(b).push(a);
      }
    }
  }
  const out = idx.slice();
  while (next.size) {
    const start = next.keys().next().value, loop = [start];
    let cur = start;
    for (let guard = 0; guard < 100000; guard++) {
      const outs = next.get(cur);
      if (!outs || !outs.length) break;
      const nxt = outs.shift();
      if (!outs.length) next.delete(cur);
      if (nxt === start) break;
      if (loop.includes(nxt)) { cur = nxt; break; } // pinched loop: stop here, next pass handles the rest
      loop.push(nxt); cur = nxt;
    }
    if (next.has(start) && !next.get(start).length) next.delete(start);
    if (loop.length < 3) continue;
    stats.holes++;
    if (loop.length === 3) { out.push(loop[0], loop[1], loop[2]); continue; }
    let cx = 0, cy = 0, cz = 0;
    for (const v of loop) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; }
    const c = pos.length / 3;
    pos.push(cx / loop.length, cy / loop.length, cz / loop.length);
    for (let i = 0; i < loop.length; i++) out.push(c, loop[i], loop[(i + 1) % loop.length]);
  }
  return out;
}

// Returns { mesh, stats: { before, after, removed, debris, holes } }. Does not modify the input.
export function repairMesh(mesh) {
  const stats = { before: countBadEdges(mesh.idx), after: 0, removed: 0, debris: 0, holes: 0 };
  const pos = Array.from(mesh.pos);
  let idx = Array.from(mesh.idx);
  for (let pass = 0; pass < 4; pass++) {
    idx = dedupe(pos, idx, stats);
    if (pass === 0) idx = dropDebris(idx, stats);
    idx = dropNonManifold(idx, stats);
    idx = fillHoles(pos, idx, stats);
    if (countBadEdges(idx) === 0) break;
  }
  // Remove vertices no triangle uses anymore.
  const used = new Map(), P = [];
  const I = idx.map(v => { if (!used.has(v)) { used.set(v, P.length / 3); P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } return used.get(v); });
  const out = { pos: new Float32Array(P), idx: new Uint32Array(I) };
  stats.after = countBadEdges(out.idx);
  return { mesh: out, stats };
}
