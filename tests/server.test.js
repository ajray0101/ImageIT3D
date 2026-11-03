// API tests: health, project CRUD, and Meshy/assistant behavior without keys.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.MESHY_API_KEY = "";      // tests never call paid APIs
process.env.ANTHROPIC_API_KEY = "";
const { createApp } = await import("../server/app.js");
const { createProjectStore } = await import("../server/db/projectStore.js");

let server, base, dir;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "it3d-"));
  server = createApp({ store: createProjectStore(dir) }).listen(0);
  await new Promise(r => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await fs.rm(dir, { recursive: true, force: true }); });

const req = (p, opts = {}) => fetch(base + p, { ...opts, headers: { "Content-Type": "application/json" } });

test("health reports optional features", async () => {
  const j = await (await req("/api/health")).json();
  assert.deepEqual(j, { meshy: false, assistant: false, projects: true });
});

test("serves the web app", async () => {
  const r = await req("/");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /ImageIT3D/);
});

test("Meshy and assistant routes explain a missing key", async () => {
  const m = await req("/api/meshy/preview", { method: "POST", body: JSON.stringify({ prompt: "fox" }) });
  assert.equal(m.status, 503);
  const a = await req("/api/assistant/design", { method: "POST", body: "{}" });
  assert.equal(a.status, 503);
});

test("project create, list, update, get, delete", async () => {
  const body = { name: "Test vase", spec: { template: "vessel", name: "Test vase", params: {} }, settings: { printer: "a1" } };
  const created = await (await req("/api/projects", { method: "POST", body: JSON.stringify(body) })).json();
  assert.ok(created.id);

  const list = await (await req("/api/projects")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].spec, undefined, "list returns summaries only");

  const upd = await req(`/api/projects/${created.id}`, { method: "PUT", body: JSON.stringify({ ...body, name: "Renamed" }) });
  assert.equal((await upd.json()).name, "Renamed");

  const got = await (await req(`/api/projects/${created.id}`)).json();
  assert.equal(got.settings.printer, "a1");

  assert.equal((await req(`/api/projects/${created.id}`, { method: "DELETE" })).status, 204);
  assert.equal((await req(`/api/projects/${created.id}`)).status, 404);
});

test("bad input gets clear JSON errors", async () => {
  assert.equal((await req("/api/projects", { method: "POST", body: "{not json" })).status, 400);
  assert.equal((await req("/api/projects", { method: "POST", body: JSON.stringify({ name: "no spec" }) })).status, 400);
  assert.equal((await req("/api/projects/not-an-id")).status, 400);
  assert.equal((await req("/api/nope")).status, 404);
});
