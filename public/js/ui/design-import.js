// Bring in detailed models: import a file, or generate one with Meshy (when the server has a key).
// generateAndImport() is also used by the design chat for requests the templates can't make.
import { $ } from "../core/utils.js";
import { parseModel, nameFromFile } from "../services/importer.js";
import { generateModel } from "../services/meshy.js";
import { checkPrompt } from "../config/content-rules.js";

// Load a model file into the app. Returns the triangle count.
async function useBuffer(ctx, buf, ext, name, { announce = true, meshyTask = null, title = null } = {}) {
  if (!THREE.STLLoader || !THREE.OBJLoader || !THREE.GLTFLoader) throw new Error("The model reader didn't load. Reload the page and try again.");
  const { mesh, tris } = await parseModel(buf, ext);
  await ctx.setImported(mesh, meshyTask);
  if (announce) ctx.state.chat.push({ role: "assistant", content: `Imported ${name}. I set it to 100 mm tall; change the height or tip it over under "Adjust shape by hand", then check printability.` });
  ctx.setSpec({ template: "imported", name: title || nameFromFile(name), params: { height: 100, turn: 0 }, text: ctx.state.spec.text }, { animate: true, resetListing: true });
  ctx.renderChat();
  $("#adjust").open = true;
  return tris;
}

// Turn a description into a short product name:
// "a Mini Snowman that is white with black eyes" -> "Mini Snowman"
export function nameFromPrompt(p) {
  const core = p.split(/[,.;:?!]|\s(?:that|which|who|with|in|and|but|so|for|i)\s/i)[0]
    .replace(/^\s*(a|an|the|some)\s+/i, "").replace(/[^\w ]+/g, "").trim();
  const name = core.split(/\s+/).slice(0, 5).join(" ").replace(/\b\w/g, c => c.toUpperCase());
  return name || "Meshy Model";
}

// Generate with Meshy and load the result. Throws with a plain-language message on failure.
export async function generateAndImport(ctx, prompt, onStatus) {
  const verdict = checkPrompt(prompt);
  if (!verdict.allowed) throw new Error(verdict.message);
  const { buffer, taskId } = await generateModel(prompt, onStatus);
  onStatus("Loading the model…");
  const title = nameFromPrompt(prompt);
  await useBuffer(ctx, buffer, "glb", title + ".glb", { announce: false, meshyTask: { id: taskId, prompt }, title });
  return title;
}

export function init(ctx) {
  const st = $("#importStatus");
  $("#importFile").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    st.textContent = `Reading ${f.name}…`;
    try { const tris = await useBuffer(ctx, await f.arrayBuffer(), ext, f.name); st.textContent = `Imported ${Math.round(tris).toLocaleString()} triangles.`; }
    catch (err) { st.textContent = err.message || "Couldn't read that file. Download it as STL and try again."; }
  });
  $("#importLabel").addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#importFile").click(); }
  });

  if (!ctx.features.meshy) return; // panel stays hidden without a server key
  $("#meshyGen").hidden = false;
  $("#meshyGo").addEventListener("click", async () => {
    const btn = $("#meshyGo"), ms = $("#meshyStatus"), prompt = $("#meshyPrompt").value.trim();
    if (!prompt) { ms.textContent = "Describe the model first."; $("#meshyPrompt").focus(); return; }
    btn.disabled = true;
    try {
      await generateAndImport(ctx, prompt, msg => { ms.textContent = msg; });
      ms.textContent = "Done. Check printability next.";
    } catch (err) { ms.textContent = err.message; }
    finally { btn.disabled = false; }
  });
}
