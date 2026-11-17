// Full-color preview for Meshy models: the "Add colors" tools, the Filament / Full color
// toggle on the stage, and the color GLB download. Printing is unchanged (one filament color).
import { $ } from "../core/utils.js";
import { colorModel } from "../services/meshy.js";
import { checkPrompt } from "../config/content-rules.js";

const isMeshyModel = ctx => ctx.state.spec.template === "imported" && Boolean(ctx.state.meshyTask);

// Run Meshy's color step on the current model. Throws with a plain-language message.
export async function addColors(ctx, texturePrompt, onStatus) {
  if (!isMeshyModel(ctx)) throw new Error("Colors can be added to models generated with Meshy in this app.");
  const prompt = (texturePrompt || ctx.state.meshyTask.prompt || "").trim();
  const verdict = checkPrompt(prompt);
  if (!verdict.allowed) throw new Error(verdict.message);
  const { buffer } = await colorModel(ctx.state.meshyTask.id, prompt, onStatus);
  onStatus("Loading the colors…");
  await ctx.setColorBuffer(buffer);
  ctx.state.showColor = true;
  ctx.refresh();
}

export function init(ctx) {
  $("#viewMode").addEventListener("click", e => {
    const b = e.target.closest("button[data-mode]"); if (!b) return;
    ctx.state.showColor = b.dataset.mode === "color";
    ctx.refresh();
  });

  $("#addColors").addEventListener("click", async () => {
    const btn = $("#addColors"), st = $("#colorStatus");
    btn.disabled = true;
    try {
      await addColors(ctx, $("#colorPrompt").value, msg => { st.textContent = msg; });
      st.textContent = "Done. Use Filament / Full color under the preview to switch views.";
    } catch (err) { st.textContent = err.message; }
    finally { btn.disabled = false; }
  });
}

export function render(ctx) {
  const meshy = isMeshyModel(ctx), colored = meshy && ctx.hasColor(), on = colored && ctx.state.showColor;
  $("#colorTools").hidden = !(ctx.features.meshy && meshy);
  if (meshy && !$("#colorPrompt").value && document.activeElement !== $("#colorPrompt")) $("#colorPrompt").value = ctx.state.meshyTask.prompt || "";
  $("#addColors").textContent = colored ? "Redo colors" : "Add colors";
  $("#viewMode").hidden = !colored;
  $("#viewMode").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.mode === "color") === on)));
  $("#swatches").classList.toggle("dimmed", on);
  $("#dlGlb").hidden = !colored;
}
