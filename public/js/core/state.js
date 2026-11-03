// App state: everything the seller has chosen. Saved to localStorage on every change.
// To add a new setting: add it to defaultState(), then read/write it through `state`.
import { PRESETS } from "../config/catalog.js";
import { sanitizeSpec } from "./spec.js";
import { deepCopy } from "./utils.js";

const KEY = "it3d-state";

export function defaultState() {
  return {
    spec: deepCopy(PRESETS.vase),
    chat: [{ role: "assistant", content: "Hi! I'm the ImageIT3D design assistant. Tell me what you'd like to sell and I'll shape a printable model. I've started you off with a vase." }],
    color: 0, printer: "a1", material: "PLA", infill: 15,
    market: "etsy", costs: { filament: 22, laborMin: 10, laborRate: 18, packaging: 1.5 },
    notes: "", listing: { title: "", description: "", tags: "" },
    projectId: null
  };
}

function load() {
  try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(KEY) || "null") || {}); }
  catch { return defaultState(); }
}

export const state = load();
state.spec = sanitizeSpec(state.spec);

export function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

// Replace the whole state, keeping the same object so every module sees the change.
export function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaultState(), next);
  state.spec = sanitizeSpec(state.spec);
}
