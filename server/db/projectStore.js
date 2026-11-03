// Project storage. Today: one JSON file (data/projects.json), fine for a class demo.
// DATABASE TEAM: replace this file with SQLite/Postgres/MongoDB. Keep the same five
// async functions and nothing else in the app has to change.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export function createProjectStore(dir) {
  const file = path.join(dir, "projects.json");
  let queue = Promise.resolve(); // serialize writes

  async function readAll() {
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch (e) { if (e.code === "ENOENT") return []; throw e; }
  }
  async function writeAll(items) {
    await fs.mkdir(dir, { recursive: true });
    const tmp = file + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(items, null, 2));
    await fs.rename(tmp, file); // atomic replace
  }
  const mutate = fn => (queue = queue.then(async () => { const items = await readAll(); const out = fn(items); await writeAll(items); return out; }));

  return {
    // Summaries only, newest first.
    async list() {
      return (await readAll())
        .map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(id) { return (await readAll()).find(p => p.id === id) || null; },
    create(data) {
      return mutate(items => {
        const now = new Date().toISOString();
        const p = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
        items.push(p); return p;
      });
    },
    update(id, data) {
      return mutate(items => {
        const i = items.findIndex(p => p.id === id);
        if (i < 0) return null;
        items[i] = { ...items[i], ...data, id, updatedAt: new Date().toISOString() };
        return items[i];
      });
    },
    remove(id) {
      return mutate(items => {
        const i = items.findIndex(p => p.id === id);
        if (i < 0) return false;
        items.splice(i, 1); return true;
      });
    }
  };
}
