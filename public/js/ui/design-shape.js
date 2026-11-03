// "Adjust shape by hand" sliders and the Letters controls.
import { $ } from "../core/utils.js";
import { TEMPLATES } from "../config/catalog.js";
import { hasFont, textPlacement } from "../geometry/text.js";

let sliderTpl = null, pending = false;

// Rebuild at most once per animation frame while a slider is being dragged.
function schedule(ctx) {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; ctx.setSpec(ctx.state.spec); });
}

function renderSliders(ctx) {
  const wrap = $("#sliders"), spec = ctx.state.spec, tpl = spec.template;
  if (sliderTpl !== tpl) {
    sliderTpl = tpl; wrap.replaceChildren();
    for (const [k, d] of Object.entries(TEMPLATES[tpl].params)) {
      const div = document.createElement("div"); div.className = "slider";
      const id = "sl-" + k;
      div.innerHTML = `<label for="${id}"><span></span><output></output></label><input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.step}">`;
      div.querySelector("span").textContent = d.label;
      const inp = div.querySelector("input");
      inp.addEventListener("input", () => { ctx.state.spec.params[k] = parseFloat(inp.value); schedule(ctx); });
      wrap.append(div);
    }
  }
  for (const [k, d] of Object.entries(TEMPLATES[tpl].params)) {
    const inp = $("#sl-" + k); if (!inp) continue;
    if (document.activeElement !== inp) inp.value = spec.params[k];
    inp.parentElement.querySelector("output").textContent = (+spec.params[k]).toFixed(d.step < 1 ? 1 : 0) + (d.unit ? " " + d.unit : "");
  }
}

function renderLetters(ctx) {
  const spec = ctx.state.spec, tx = spec.text, info = ctx.current.textInfo, where = textPlacement(spec);
  ["tText", "tSize", "tDepth"].forEach(id => { $("#" + id).disabled = !where || !hasFont(); });
  if (document.activeElement !== $("#tText")) $("#tText").value = tx.content;
  if (document.activeElement !== $("#tSize")) $("#tSize").value = tx.size;
  if (document.activeElement !== $("#tDepth")) $("#tDepth").value = tx.depth;
  $("#tSizeOut").textContent = (info && info.shrunk ? info.letterH.toFixed(1) + " of " : "") + tx.size.toFixed(1) + " mm";
  $("#tDepthOut").textContent = tx.depth.toFixed(1) + " mm";
  $("#textWhere").textContent = !where
    ? "Letters can't be added to imported models here. Add them in Meshy before you download, or in your slicer."
    : where + (info && info.shrunk ? " Your text was shrunk to fit." : "");
}

export function init(ctx) {
  $("#tText").addEventListener("input", e => { ctx.state.spec.text.content = e.target.value; schedule(ctx); });
  $("#tSize").addEventListener("input", e => { ctx.state.spec.text.size = +e.target.value; schedule(ctx); });
  $("#tDepth").addEventListener("input", e => { ctx.state.spec.text.depth = +e.target.value; schedule(ctx); });
}

export function render(ctx) { renderSliders(ctx); renderLetters(ctx); }
