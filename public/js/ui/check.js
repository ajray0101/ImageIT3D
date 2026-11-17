// Step 2: printability checks and stats.
import { $, fmtHours } from "../core/utils.js";
import { PRINTERS, MATERIALS } from "../config/catalog.js";
import { planFixes, leftoverAdvice } from "../analysis/autofix.js";
import { repairMesh } from "../geometry/repair.js";
import { deepCopy } from "../core/utils.js";

let undo = null;      // { spec, imported } from before the last fix
let reportFor = null; // the spec the report describes; any later change hides it

function li(text) { const el = document.createElement("li"); el.textContent = text; return el; }

function showReport(ctx, actions) {
  const box = $("#fixReport"), left = leftoverAdvice(ctx.current.evaluation);
  box.replaceChildren();
  const h = document.createElement("h3");
  h.textContent = !actions.length ? "Nothing to change automatically" : left.length ? "Fixed what I could" : "All fixed";
  box.append(h);
  if (actions.length) { const ul = document.createElement("ul"); ul.className = "done"; actions.forEach(a => ul.append(li(a))); box.append(ul); }
  if (left.length) {
    const p = document.createElement("p"); p.textContent = "Still to do in your slicer:"; box.append(p);
    const ul = document.createElement("ul"); ul.className = "left"; left.forEach(x => ul.append(li(x.advice))); box.append(ul);
  }
  if (undo) {
    const row = document.createElement("div"); row.className = "actions";
    const b = document.createElement("button"); b.className = "btn ghost"; b.textContent = "Undo fixes";
    b.onclick = async () => {
      const prev = undo; undo = null;
      if (prev.imported && prev.imported !== ctx.imported) await ctx.setImported(prev.imported, ctx.state.meshyTask, { keepColor: true });
      ctx.setSpec(prev.spec);
      box.hidden = true;
    };
    row.append(b); box.append(row);
  }
  box.hidden = false;
}

async function fixPrintability(ctx) {
  const btn = $("#fixBtn"); btn.disabled = true; btn.textContent = "Fixing…";
  await new Promise(r => setTimeout(r, 30)); // let the button update before heavy work
  try {
    undo = { spec: deepCopy(ctx.state.spec), imported: ctx.imported };
    const actions = [];

    // 1. Repair the mesh of an imported or Meshy model.
    if (ctx.state.spec.template === "imported" && ctx.imported && ctx.current.analysis.badEdges > 0) {
      const { mesh, stats } = repairMesh(ctx.imported);
      await ctx.setImported(mesh, ctx.state.meshyTask, { keepColor: true });
      ctx.refresh();
      const parts = [];
      if (stats.holes) parts.push(`closed ${stats.holes} hole${stats.holes === 1 ? "" : "s"}`);
      if (stats.removed) parts.push(`removed ${stats.removed} broken or duplicate faces`);
      if (stats.debris) parts.push(`removed ${stats.debris} faces of loose debris`);
      actions.push(stats.after === 0 ? `Repaired the mesh: ${parts.join(", ") || "fixed its edges"}. It's now watertight.`
        : `Repaired most of the mesh (${parts.join(", ")}); ${stats.after} edges still need your slicer's repair tool.`);
    }

    // 2. Adjust settings, re-checking after each round (one change can affect another check).
    for (let round = 0; round < 3; round++) {
      const plan = planFixes({ spec: ctx.state.spec, evaluation: ctx.current.evaluation, analysis: ctx.current.analysis, textInfo: ctx.current.textInfo, printer: ctx.state.printer });
      const fresh = plan.actions.filter(a => !actions.includes(a));
      if (!fresh.length) break;
      actions.push(...fresh);
      ctx.setSpec(plan.spec);
    }
    if (!actions.length) undo = null;
    reportFor = JSON.stringify(ctx.state.spec);
    showReport(ctx, actions);
  } finally {
    btn.disabled = false; btn.textContent = "Fix printability";
  }
}

const ICON = { pass: "✓", warn: "!", fail: "✕" }, WORD = { pass: "Passed", warn: "Warning", fail: "Failed" };

export function init(ctx) {
  Object.entries(PRINTERS).forEach(([k, p]) => $("#printer").add(new Option(`${p.name} (${p.x}×${p.y}×${p.z})`, k)));
  $("#printer").addEventListener("change", e => { ctx.state.printer = e.target.value; ctx.viewer.setPrinter(PRINTERS[ctx.state.printer]); ctx.refresh(); });
  $("#material").addEventListener("change", e => { ctx.state.material = e.target.value; ctx.state.costs.filament = MATERIALS[ctx.state.material].cost; ctx.refresh(); });
  $("#infill").addEventListener("input", e => { ctx.state.infill = +e.target.value; ctx.refresh(); });
  $("#fixBtn").addEventListener("click", () => fixPrintability(ctx));
}

export function render(ctx) {
  const { state } = ctx, A = ctx.current.analysis, E = ctx.current.evaluation;
  $("#printer").value = state.printer; $("#material").value = state.material;
  $("#infill").value = state.infill; $("#infillOut").textContent = state.infill + "%";

  $("#fixBar").hidden = E.level === "pass";
  if (reportFor && reportFor !== JSON.stringify(ctx.state.spec)) { reportFor = null; undo = null; $("#fixReport").hidden = true; }
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
