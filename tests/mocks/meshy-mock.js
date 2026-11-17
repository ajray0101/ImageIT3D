// Fake Meshy server for testing the generate and color flows WITHOUT spending credits.
//
//   Terminal 1:  npm run mock:meshy
//   Terminal 2:  (PowerShell) $env:MESHY_BASE_URL="http://localhost:4010/openapi/v2/text-to-3d"; $env:MESHY_API_KEY="mock"; npm start
//                (Git Bash)  MESHY_BASE_URL=http://localhost:4010/openapi/v2/text-to-3d MESHY_API_KEY=mock npm start
//
// Every request returns the same snowman-like shape after a few seconds. "refine" tasks return
// it with colors (vertex colors), like Meshy's real color step.
import express from "express";
import * as THREE from "three";

const PORT = Number(process.env.MOCK_PORT || 4010);
const DELAY_MS = Number(process.env.MOCK_DELAY_MS || 4000);
const app = express();
app.use(express.json());
const tasks = new Map();

// Build a simple figure: base disc, two body spheres, a hat. Colors per part for the refine version.
function buildGlb(colored) {
  const parts = [
    [new THREE.CylinderGeometry(0.42, 0.42, 0.08, 40).translate(0, 0.04, 0), [0.55, 0.55, 0.6]],
    [new THREE.SphereGeometry(0.4, 40, 24).translate(0, 0.45, 0), [0.95, 0.95, 0.97]],
    [new THREE.SphereGeometry(0.28, 40, 24).translate(0, 0.98, 0), [0.95, 0.95, 0.97]],
    [new THREE.ConeGeometry(0.06, 0.22, 16).rotateX(Math.PI / 2).translate(0, 0.98, 0.36), [0.95, 0.5, 0.1]],
    [new THREE.CylinderGeometry(0.2, 0.2, 0.26, 32).translate(0, 1.36, 0), [0.08, 0.08, 0.08]],
    [new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32).translate(0, 1.24, 0), [0.08, 0.08, 0.08]]
  ];
  const pos = [], col = [], idx = [];
  for (const [g, c] of parts) {
    const base = pos.length / 3, p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); col.push(...c); }
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
  }
  const P = new Float32Array(pos), C = new Float32Array(col), I = new Uint32Array(idx);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]); }

  const views = [P, I].concat(colored ? [C] : []);
  let offset = 0; const bufferViews = [];
  for (const v of views) { bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: v.byteLength }); offset += v.byteLength; }
  const accessors = [
    { bufferView: 0, componentType: 5126, count: P.length / 3, type: "VEC3", min, max },
    { bufferView: 1, componentType: 5125, count: I.length, type: "SCALAR" }
  ];
  const attributes = { POSITION: 0 };
  if (colored) { accessors.push({ bufferView: 2, componentType: 5126, count: C.length / 3, type: "VEC3" }); attributes.COLOR_0 = 2; }
  const gltf = {
    asset: { version: "2.0", generator: "ImageIT3D Meshy mock" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.7 } }],
    bufferViews, accessors, buffers: [{ byteLength: offset }]
  };
  const pad = (buf, ch) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4, ch)]);
  const json = pad(Buffer.from(JSON.stringify(gltf)), 0x20);
  const bin = pad(Buffer.concat(views.map(v => Buffer.from(v.buffer))), 0);
  const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, bh, bin]);
}
const GLB = { plain: buildGlb(false), colored: buildGlb(true) };

app.post("/openapi/v2/text-to-3d", (req, res) => {
  const mode = req.body?.mode;
  if (mode !== "preview" && mode !== "refine") return res.status(400).json({ message: "mode must be preview or refine" });
  if (mode === "refine" && !tasks.has(req.body.preview_task_id)) return res.status(400).json({ message: "Invalid task ID" });
  const id = `mock-${mode}-${Math.random().toString(36).slice(2, 12)}`;
  tasks.set(id, { mode, created: Date.now() });
  console.log(`${mode} task ${id}`, mode === "preview" ? `"${req.body.prompt}"` : `colors: "${req.body.texture_prompt || ""}"`);
  res.json({ result: id });
});

app.get("/openapi/v2/text-to-3d/:id", (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).json({ message: "Task not found" });
  const elapsed = Date.now() - t.created, done = elapsed >= DELAY_MS;
  res.json({
    id: req.params.id, status: done ? "SUCCEEDED" : "IN_PROGRESS", progress: done ? 100 : Math.round((elapsed / DELAY_MS) * 99),
    model_urls: done ? { glb: `http://localhost:${PORT}/files/${req.params.id}.glb` } : {}, task_error: null
  });
});

app.get("/files/:id.glb", (req, res) => {
  const t = tasks.get(req.params.id);
  if (!t) return res.status(404).end();
  res.type("model/gltf-binary").send(t.mode === "refine" ? GLB.colored : GLB.plain);
});

app.listen(PORT, () => console.log(`Mock Meshy running at http://localhost:${PORT}/openapi/v2/text-to-3d`));
