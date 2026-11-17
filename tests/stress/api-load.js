// Stress and rate-limit test for the API. Not part of `npm test` (it takes longer).
// Run with: node tests/stress/api-load.js
// Starts the real server on a random port with a temporary data folder, so it never
// touches your saved projects or calls paid APIs.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.MESHY_API_KEY = "stress-test-placeholder"; // enables the Meshy routes; no real call is made
process.env.MESHY_MAX_PER_HOUR = "10";
process.env.ANTHROPIC_API_KEY = "";
const { createApp } = await import("../../server/app.js");
const { createProjectStore } = await import("../../server/db/projectStore.js");

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "it3d-stress-"));
const server = createApp({ store: createProjectStore(dir) }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://localhost:${server.address().port}`;

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
async function burst(label, total, concurrency, makeRequest) {
  const times = [], statuses = {};
  let next = 0;
  const start = performance.now();
  async function worker() {
    while (next < total) {
      const i = next++;
      const t0 = performance.now();
      const r = await makeRequest(i);
      await r.arrayBuffer();
      times.push(performance.now() - t0);
      statuses[r.status] = (statuses[r.status] || 0) + 1;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const secs = (performance.now() - start) / 1000;
  times.sort((a, b) => a - b);
  console.log(`${label.padEnd(30)} ${String(total).padStart(5)} req  ${String(concurrency).padStart(3)} at once  ` +
    `${(total / secs).toFixed(0).padStart(5)} req/s  p50 ${pct(times, 0.5).toFixed(1).padStart(5)} ms  ` +
    `p95 ${pct(times, 0.95).toFixed(1).padStart(5)} ms  status ${JSON.stringify(statuses)}`);
  return statuses;
}

const json = body => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const project = i => ({ name: `Load test ${i}`, spec: { template: "vessel", name: `Load test ${i}`, params: {} }, settings: {} });

console.log("ImageIT3D API stress test\n");
await burst("GET /api/health", 2000, 50, () => fetch(base + "/api/health"));
await burst("GET / (web app)", 1000, 50, () => fetch(base + "/"));
await burst("POST /api/projects (writes)", 300, 25, i => fetch(base + "/api/projects", json(project(i))));
await burst("GET /api/projects (list)", 500, 50, () => fetch(base + "/api/projects"));
const bad = await burst("POST /api/projects bad JSON", 500, 50, () =>
  fetch(base + "/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops" }));

const saved = JSON.parse(await fs.readFile(path.join(dir, "projects.json"), "utf8"));
console.log(`\nProjects written: ${saved.length} of 300 (file is valid JSON: yes)`);
console.log(`Bad JSON handled as 400: ${bad[400] === 500 ? "yes" : "NO"}`);

// Rate limit: the 11th generation request within an hour must be refused with 429.
// Empty prompts are rejected (400) by the route itself, so Meshy is never contacted.
const codes = [];
for (let i = 0; i < 12; i++) codes.push((await fetch(base + "/api/meshy/preview", json({ prompt: "" }))).status);
console.log(`\nMeshy rate limit (limit 10/hour), 12 requests: ${codes.join(", ")}`);
console.log(`Requests 11 and 12 blocked with 429: ${codes[10] === 429 && codes[11] === 429 ? "yes" : "NO"}`);

const big = await fetch(base + "/api/projects", json({ ...project(0), spec: { template: "vessel", pad: "x".repeat(400_000) } }));
console.log(`Oversized body (400 KB) rejected: ${big.status === 413 ? "yes (413)" : "NO (" + big.status + ")"}`);

server.close();
await fs.rm(dir, { recursive: true, force: true });
