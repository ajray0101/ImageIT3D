// Meshy Text to 3D API client. Docs: https://docs.meshy.ai/api/text-to-3d
import { config } from "../config.js";
import { userError } from "../middleware/asyncRoute.js";


async function call(path = "", init = {}) {
  let r;
  try {
    r = await fetch(config.meshyBaseUrl + path, {
      ...init,
      headers: { Authorization: `Bearer ${config.meshyKey}`, "Content-Type": "application/json", ...(init.headers || {}) }
    });
  } catch {
    throw userError(502, "Couldn't reach Meshy. Check the server's internet connection and try again.");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = { 401: "Meshy rejected the API key.", 402: "The Meshy account is out of credits or needs a paid plan.", 403: "Meshy's content filter blocked that description. Try describing something else.", 429: "Meshy is rate limiting requests. Wait a minute." }[r.status];
    throw userError(r.status, msg || data.message || "Meshy didn't accept the request.");
  }
  return data;
}

// Added to every request so Meshy aims for something a home printer can handle.
export const PRINT_GUIDANCE = "Single solid object for 3D printing, standing on a flat base, chunky sturdy proportions, no thin fragile parts.";
export const MAX_PROMPT = 800 - PRINT_GUIDANCE.length - 2; // Meshy accepts up to 800 characters in total

// Preview = geometry only, which is all a 3D print needs (refine only adds textures).
export async function createPreview(prompt) {
  const data = await call("", {
    method: "POST",
    body: JSON.stringify({
      mode: "preview",
      prompt: `${prompt.replace(/[.\s]+$/, "")}. ${PRINT_GUIDANCE}`,
      ai_model: "latest",
      should_remesh: true,       // keeps triangle counts manageable for the browser checks
      target_polycount: 100000,
      target_formats: ["glb", "stl"],
      moderation: true
    })
  });
  return data.result; // task id
}

// Refine = paint colors (textures) onto a finished preview. Same mesh, now in color.
export async function createRefine(previewTaskId, texturePrompt) {
  const body = { mode: "refine", preview_task_id: previewTaskId, target_formats: ["glb"], moderation: true };
  if (texturePrompt) body.texture_prompt = texturePrompt;
  const data = await call("", { method: "POST", body: JSON.stringify(body) });
  return data.result; // task id
}

export const getTask = id => call("/" + id);

// Download a finished model file. Only fetches URLs Meshy returned for this task.
export async function downloadModel(id, format) {
  const t = await getTask(id);
  if (t.status !== "SUCCEEDED") throw userError(409, "The model isn't finished yet.");
  const url = t.model_urls?.[format];
  if (!url) throw userError(404, `Meshy didn't produce a ${format.toUpperCase()} file for this task.`);
  const file = await fetch(url);
  if (!file.ok) throw userError(502, "Couldn't download the file from Meshy.");
  return Buffer.from(await file.arrayBuffer());
}
