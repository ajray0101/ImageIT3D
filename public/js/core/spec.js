// A "spec" fully describes one model: { template, name, params, text }.
// sanitizeSpec clamps every value into its template's range so bad input
// (from the chat, the server or saved projects) can never break the geometry.
import { TEMPLATES } from "../config/catalog.js";
import { clamp } from "./utils.js";

export function sanitizeSpec(spec) {
  const tpl = TEMPLATES[spec && spec.template] ? spec.template : "vessel";
  const out = { template: tpl, name: String((spec && spec.name) || TEMPLATES[tpl].label).slice(0, 60), params: {} };
  for (const [k, d] of Object.entries(TEMPLATES[tpl].params)) {
    const v = Number(spec && spec.params && spec.params[k]);
    out.params[k] = Number.isFinite(v) ? clamp(v, d.min, d.max) : d.def;
  }
  if (tpl === "vessel") out.params.floor = Math.min(out.params.floor, out.params.height - 1);
  const t = (spec && spec.text) || {};
  const sz = Number(t.size), dp = Number(t.depth);
  out.text = {
    content: String(t.content || "").replace(/[^\x20-\x7E]/g, "").slice(0, 24),
    size: Number.isFinite(sz) ? clamp(sz, 3, 40) : 12,
    depth: Number.isFinite(dp) ? clamp(dp, 0.4, 3) : 1
  };
  return out;
}
