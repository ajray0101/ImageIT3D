// Bring in detailed models: import a file, or generate one with Meshy (when the server has a key).
import { $ } from "../core/utils.js";
import { parseModel, nameFromFile } from "../services/importer.js";
import { generateModel } from "../services/meshy.js";

async function useBuffer(ctx, buf, ext, fileName, statusEl) {
  if (!THREE.STLLoader || !THREE.OBJLoader || !THREE.GLTFLoader) throw new Error("The model reader didn't load. Reload the page and try again.");
  const { mesh, tris } = await parseModel(buf, ext);
  await ctx.setImported(mesh);
  ctx.state.chat.push({ role: "assistant", content: `Imported ${fileName}. I set it to 100 mm tall; change the height or tip it over under "Adjust shape by hand", then check printability.` });
  ctx.setSpec({ template: "imported", name: nameFromFile(fileName), params: { height: 100, turn: 0 }, text: ctx.state.spec.text }, { animate: true, resetListing: true });
  ctx.renderChat();
  $("#adjust").open = true;
  statusEl.textContent = `Imported ${Math.round(tris).toLocaleString()} triangles.`;
}

export function init(ctx) {
  const st = $("#importStatus");
  $("#importFile").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    st.textContent = `Reading ${f.name}…`;
    try { await useBuffer(ctx, await f.arrayBuffer(), ext, f.name, st); }
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
      const buf = await generateModel(prompt, msg => { ms.textContent = msg; });
      const fname = (prompt.replace(/[^\w ]+/g, "").trim().split(/\s+/).slice(0, 6).join("-") || "meshy-model") + ".glb";
      await useBuffer(ctx, buf, "glb", fname, ms);
      ms.textContent = "Done. Check printability next.";
    } catch (err) { ms.textContent = err.message; }
    finally { btn.disabled = false; }
  });
}
