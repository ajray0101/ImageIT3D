// Step 2: printability checks and stats.
import { $, fmtHours } from "../core/utils.js";
import { PRINTERS, MATERIALS } from "../config/catalog.js";

const ICON = { pass: "✓", warn: "!", fail: "✕" }, WORD = { pass: "Passed", warn: "Warning", fail: "Failed" };

export function init(ctx) {
  Object.entries(PRINTERS).forEach(([k, p]) => $("#printer").add(new Option(`${p.name} (${p.x}×${p.y}×${p.z})`, k)));
  $("#printer").addEventListener("change", e => { ctx.state.printer = e.target.value; ctx.viewer.setPrinter(PRINTERS[ctx.state.printer]); ctx.refresh(); });
  $("#material").addEventListener("change", e => { ctx.state.material = e.target.value; ctx.state.costs.filament = MATERIALS[ctx.state.material].cost; ctx.refresh(); });
  $("#infill").addEventListener("input", e => { ctx.state.infill = +e.target.value; ctx.refresh(); });
}

export function render(ctx) {
  const { state } = ctx, A = ctx.current.analysis, E = ctx.current.evaluation;
  $("#printer").value = state.printer; $("#material").value = state.material;
  $("#infill").value = state.infill; $("#infillOut").textContent = state.infill + "%";

  $("#checks").replaceChildren(...E.checks.map(c => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot ${c.l}" aria-hidden="true">${ICON[c.l]}</span><div><b></b><span></span></div>`;
    li.querySelector("b").textContent = c.t;
    li.querySelector("div span").textContent = c.d;
    li.setAttribute("aria-label", `${WORD[c.l]}: ${c.t}. ${c.d}`);
    return li;
  }));

  const stats = [
    ["Size", `${A.size.map(v => v.toFixed(0)).join(" × ")} mm`], ["Volume", (A.vol / 1000).toFixed(1) + " cm³"],
    ["Filament", E.grams.toFixed(0) + " g"], ["Print time", fmtHours(E.hours)],
    ["Thinnest wall", !Number.isFinite(A.minWall) ? "Not measured" : A.minWall.toFixed(1) + " mm"]
  ];
  $("#stats").replaceChildren(...stats.map(([k, v]) => {
    const d = document.createElement("div"); d.innerHTML = "<dt></dt><dd></dd>";
    d.firstChild.textContent = k; d.lastChild.textContent = v;
    return d;
  }));
}
