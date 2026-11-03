// Step 3: cost breakdown and the three price points.
import { $, money } from "../core/utils.js";
import { MARKETS } from "../config/catalog.js";

const INPUTS = { cFil: "filament", cLabMin: "laborMin", cLabRate: "laborRate", cPack: "packaging" };

export function init(ctx) {
  Object.entries(MARKETS).forEach(([k, m]) => $("#market").add(new Option(m.name, k)));
  $("#market").addEventListener("change", e => { ctx.state.market = e.target.value; ctx.refresh(); });
  Object.entries(INPUTS).forEach(([id, key]) => $("#" + id).addEventListener("input", e => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v) && v >= 0) { ctx.state.costs[key] = v; ctx.refresh(); }
  }));
}

export function render(ctx) {
  const { state } = ctx, P = ctx.current.price;
  $("#market").value = state.market;
  Object.entries(INPUTS).forEach(([id, key]) => { if (document.activeElement !== $("#" + id)) $("#" + id).value = state.costs[key]; });

  const tb = $("#costTable"); tb.replaceChildren();
  [...P.rows, ["Cost to make one", P.cost]].forEach(([k, v], i, arr) => {
    const tr = tb.insertRow(); if (i === arr.length - 1) tr.className = "total";
    tr.insertCell().textContent = k; tr.insertCell().textContent = money(v);
  });

  $("#tiers").replaceChildren(...P.tiers.map(([name, t]) => {
    const d = document.createElement("div");
    d.className = "tier" + (name === "Recommended" ? " rec" : "");
    d.innerHTML = `<div class="t"></div><div class="p"></div><div class="k"></div>`;
    d.children[0].textContent = name; d.children[1].textContent = money(t.price);
    d.children[2].textContent = `You keep ${money(t.keep)} after ${money(t.fees)} in fees`;
    return d;
  }));
  $("#feeNote").textContent = P.market.note + " Shipping is not included; charge it separately.";
}
