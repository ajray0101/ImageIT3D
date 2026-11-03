// Builds the Express app. Kept separate from index.js so tests can start it on any port.
import express from "express";
import { config } from "./config.js";
import meshyRoutes from "./routes/meshy.js";
import assistantRoutes from "./routes/assistant.js";
import { projectRoutes } from "./routes/projects.js";
import { createProjectStore } from "./db/projectStore.js";

export function createApp({ store = createProjectStore(config.dataDir) } = {}) {
  const app = express();
  app.use(express.json({ limit: "300kb" }));
  app.use(express.static(config.publicDir));

  // The page calls this on load to decide which panels to show.
  app.get("/api/health", (req, res) => res.json({ meshy: Boolean(config.meshyKey), assistant: Boolean(config.anthropicKey), projects: true }));

  app.use("/api/meshy", meshyRoutes);
  app.use("/api/assistant", assistantRoutes);
  app.use("/api/projects", projectRoutes(store));

  app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API route." }));

  // Bad JSON bodies and other unexpected errors come back as JSON, not HTML.
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "The request body isn't valid JSON." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "The request is too large." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  });
  return app;
}
