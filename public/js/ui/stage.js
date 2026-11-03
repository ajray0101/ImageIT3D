// The 3D stage: model name, size, verdict badge and filament color swatches.
import { $ } from "../core/utils.js";
import { COLORS } from "../config/catalog.js";
import { VERDICTS } from "../analysis/printability.js";

function paintSwatches(ctx) {
  [...$("#swatches").children].forEach((b, i) => b.setAttribute("aria-pressed", i === ctx.state.color));
}

export function init(ctx) {
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch"; b.style.background = c.hex; b.title = c.name; b.setAttribute("aria-label", c.name);
    b.onclick = () => { ctx.state.color = i; ctx.viewer.setColor(c.hex); paintSwatches(ctx); ctx.save(); };
    $("#swatches").append(b);
  });
  paintSwatches(ctx);
}

export function render(ctx) {
  const E = ctx.current.evaluation, [title, sub] = VERDICTS[E.level];
  $("#modelName").textContent = ctx.state.spec.name;
  $("#dims").textContent = ctx.dimsText();
  $("#verdict").dataset.level = E.level;
  $("#verdict b").textContent = title;
  $("#verdictSub").textContent = sub;
}
