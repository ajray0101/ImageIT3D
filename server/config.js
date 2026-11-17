// All server settings come from .env (see .env.example). Nothing secret is hard-coded.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  port: Number(process.env.PORT || 3000),
  publicDir: path.join(root, "public"),
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data"),

  meshyKey: process.env.MESHY_API_KEY || "",
  // Only change this to point at the mock server (npm run mock:meshy) for testing without credits.
  meshyBaseUrl: process.env.MESHY_BASE_URL || "https://api.meshy.ai/openapi/v2/text-to-3d",
  meshyMaxPerHour: Number(process.env.MESHY_MAX_PER_HOUR || 10),

  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  assistantMaxPerHour: Number(process.env.ASSISTANT_MAX_PER_HOUR || 120)
};
