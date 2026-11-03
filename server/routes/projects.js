// /api/projects  Save and reopen products. Backed by server/db/projectStore.js.
import { Router } from "express";
import { asyncRoute, userError } from "../middleware/asyncRoute.js";

const validId = id => /^[0-9a-f-]{36}$/i.test(id);

// Keep only the fields we expect, so the store never holds arbitrary client data.
function clean(body) {
  const b = body || {};
  if (!b.spec || typeof b.spec !== "object") throw userError(400, "A project needs a spec.");
  const size = JSON.stringify(b).length;
  if (size > 200_000) throw userError(413, "That project is too large to save.");
  return {
    name: String(b.name || b.spec.name || "Untitled").slice(0, 80),
    spec: b.spec,
    settings: b.settings && typeof b.settings === "object" ? b.settings : {},
    listing: b.listing && typeof b.listing === "object" ? b.listing : { title: "", description: "", tags: "" }
  };
}

export function projectRoutes(store) {
  const router = Router();
  router.get("/", asyncRoute(async (req, res) => res.json(await store.list())));
  router.get("/:id", asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) throw userError(400, "Invalid project id.");
    const p = await store.get(req.params.id);
    if (!p) throw userError(404, "Project not found.");
    res.json(p);
  }));
  router.post("/", asyncRoute(async (req, res) => res.status(201).json(await store.create(clean(req.body)))));
  router.put("/:id", asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) throw userError(400, "Invalid project id.");
    const p = await store.update(req.params.id, clean(req.body));
    if (!p) throw userError(404, "Project not found.");
    res.json(p);
  }));
  router.delete("/:id", asyncRoute(async (req, res) => {
    if (!validId(req.params.id)) throw userError(400, "Invalid project id.");
    if (!(await store.remove(req.params.id))) throw userError(404, "Project not found.");
    res.status(204).end();
  }));
  return router;
}
