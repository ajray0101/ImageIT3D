// Imported template: a mesh brought in from a file or from Meshy.
// `source` is a normalized mesh ({ pos, idx }); params scale it and tip it over.

export function buildImported(source, p) {
  const src = source.pos, pos = new Float32Array(src.length);
  const a = p.turn * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < src.length; i += 3) {
    const y = src[i + 1], z = src[i + 2];
    pos[i] = src[i]; pos[i + 1] = y * c - z * s; pos[i + 2] = y * s + z * c;
    lo = Math.min(lo, pos[i + 1]); hi = Math.max(hi, pos[i + 1]);
  }
  const k = p.height / Math.max(hi - lo, 1e-6);
  for (let i = 0; i < pos.length; i++) pos[i] *= k;
  return { pos, idx: source.idx.slice(), minWall: NaN, info: { kind: "imported" } }; // wall thickness unknown
}
