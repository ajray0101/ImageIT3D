// Meshy Text to 3D, through our server (the API key never reaches the browser).
//   generateModel(prompt)             -> { buffer, taskId }  shape only (preview)
//   colorModel(previewTaskId, colors) -> { buffer, taskId }  same shape, painted (refine)
import { api } from "./api.js";
import { sleep } from "../core/utils.js";

// Poll a task until it finishes, then download its GLB.
async function waitAndDownload(taskId, onStatus, verb) {
  const id = encodeURIComponent(taskId), started = Date.now();
  let t = { status: "PENDING", progress: 0 };
  while (t.status === "PENDING" || t.status === "IN_PROGRESS") {
    if (Date.now() - started > 15 * 60 * 1000) throw new Error("Meshy is taking longer than 15 minutes. Try again later.");
    await sleep(4000);
    t = await api(`/api/meshy/tasks/${id}`);
    onStatus(t.status === "PENDING" ? "Waiting in Meshy's queue…" : `Meshy is ${verb}: ${t.progress || 0}%`);
  }
  if (t.status !== "SUCCEEDED") throw new Error(t.error || "Meshy couldn't finish that. Try describing it differently.");
  onStatus("Downloading the model…");
  const r = await api(`/api/meshy/tasks/${id}/model?format=glb`, { raw: true });
  return { buffer: await r.arrayBuffer(), taskId };
}

export async function generateModel(prompt, onStatus = () => {}) {
  onStatus("Sending to Meshy…");
  const { taskId } = await api("/api/meshy/preview", { method: "POST", body: { prompt } });
  return waitAndDownload(taskId, onStatus, "building your model");
}

export async function colorModel(previewTaskId, texturePrompt, onStatus = () => {}) {
  onStatus("Sending to Meshy…");
  const { taskId } = await api("/api/meshy/refine", { method: "POST", body: { previewTaskId, texturePrompt } });
  return waitAndDownload(taskId, onStatus, "painting your model");
}
