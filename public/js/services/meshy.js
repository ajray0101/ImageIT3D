// Meshy Text to 3D, through our server (the API key never reaches the browser).
// generateModel resolves with the finished GLB as an ArrayBuffer.
import { api } from "./api.js";
import { sleep } from "../core/utils.js";

export async function generateModel(prompt, onStatus = () => {}) {
  onStatus("Sending to Meshy…");
  const { taskId } = await api("/api/meshy/preview", { method: "POST", body: { prompt } });
  const id = encodeURIComponent(taskId), started = Date.now();
  let t = { status: "PENDING", progress: 0 };
  while (t.status === "PENDING" || t.status === "IN_PROGRESS") {
    if (Date.now() - started > 15 * 60 * 1000) throw new Error("Meshy is taking longer than 15 minutes. Check the task in your Meshy dashboard.");
    await sleep(4000);
    t = await api(`/api/meshy/tasks/${id}`);
    onStatus(t.status === "PENDING" ? "Waiting in Meshy's queue…" : `Meshy is building your model: ${t.progress || 0}%`);
  }
  if (t.status !== "SUCCEEDED") throw new Error(t.error || "Meshy couldn't build that model. Try describing it differently.");
  onStatus("Downloading the model…");
  const r = await api(`/api/meshy/tasks/${id}/model?format=glb`, { raw: true });
  return r.arrayBuffer();
}
