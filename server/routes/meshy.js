// /api/meshy/*  Browser -> this server -> Meshy. The key stays on the server.
import { Router } from "express";
import { config } from "../config.js";
import { asyncRoute, userError } from "../middleware/asyncRoute.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { createPreview, getTask, downloadModel } from "../services/meshyClient.js";

const router = Router();
const validId = id => /^[A-Za-z0-9-]{8,64}$/.test(id);
const TYPES = { glb: "model/gltf-binary", stl: "model/stl", obj: "text/plain" };

router.use((req, res, next) => (config.meshyKey ? next() : res.status(503).json({ error: "The server has no Meshy API key. Add MESHY_API_KEY to .env." })));

// Start a Text to 3D preview task.
router.post("/preview",
  rateLimit({ max: config.meshyMaxPerHour, message: `Limit of ${config.meshyMaxPerHour} generations per hour reached. Try again later.` }),
  asyncRoute(async (req, res) => {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) throw userError(400, "Describe the model first.");
    if (prompt.length > 800) throw userError(400, "Keep the description under 800 characters.");
    res.json({ taskId: await createPreview(prompt) });
  }));

// Status and progress. Never returns Meshy's signed file URLs.
router.get("/tasks/:id", asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) throw userError(400, "Invalid task id.");
  const t = await getTask(req.params.id);
  res.json({ status: t.status, progress: t.progress, thumbnail: t.thumbnail_url || null, error: t.task_error?.message || "", formats: Object.keys(t.model_urls || {}) });
}));

// Download the finished model through this server.
router.get("/tasks/:id/model", asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) throw userError(400, "Invalid task id.");
  const format = TYPES[req.query.format] ? req.query.format : "glb";
  const buf = await downloadModel(req.params.id, format);
  res.set("Content-Type", TYPES[format]).set("Content-Disposition", `attachment; filename="model.${format}"`).send(buf);
}));

export default router;
