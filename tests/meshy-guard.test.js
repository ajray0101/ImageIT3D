// The server must refuse blocked or oversized descriptions before contacting Meshy.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.MESHY_API_KEY = "test-placeholder"; // enables the route; these requests never reach Meshy
process.env.MESHY_MAX_PER_HOUR = "100";
const { createApp } = await import("../server/app.js");
const { createProjectStore } = await import("../server/db/projectStore.js");

let server, base, dir;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "it3d-guard-"));
  server = createApp({ store: createProjectStore(dir) }).listen(0);
  await new Promise(r => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await fs.rm(dir, { recursive: true, force: true }); });

const post = prompt => fetch(base + "/api/meshy/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });

test("server refuses a blocked description with 422 and a plain message", async () => {
  for (const p of ["a pistol", "a nude statue", "a swastika"]) {
    const r = await post(p);
    assert.equal(r.status, 422, p);
    assert.match((await r.json()).error, /can't make that/);
  }
});

test("server refuses an empty or oversized description", async () => {
  assert.equal((await post("")).status, 400);
  assert.equal((await post("x".repeat(900))).status, 400);
});

const refine = body => fetch(base + "/api/meshy/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("color step rejects a bad task id or a blocked color description", async () => {
  assert.equal((await refine({ previewTaskId: "../etc/passwd" })).status, 400);
  assert.equal((await refine({ previewTaskId: "abcd1234-ok", texturePrompt: "a nude figure" })).status, 422);
});
