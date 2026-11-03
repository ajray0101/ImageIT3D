// App entry point. Wires state, geometry, analysis and the UI panels together.
//
// Flow on every change:  state.spec -> buildModel -> analyze -> evaluate -> pricing -> render panels
//
// Each UI module in ui/ exports init(ctx) (runs once) and render(ctx) (runs after every refresh).
// `ctx` is the shared context below; see docs/ARCHITECTURE.md.
import { $ } from "./core/utils.js";
import { slugify, deepCopy } from "./core/utils.js";
import { state, saveState, replaceState, defaultState } from "./core/state.js";
import { sanitizeSpec } from "./core/spec.js";
import { COLORS, PRINTERS, PRESETS } from "./config/catalog.js";
import { buildModel } from "./geometry/build.js";
import { loadFont } from "./geometry/text.js";
import { analyze, evaluate } from "./analysis/printability.js";
import { pricing } from "./analysis/pricing.js";
import { createViewer } from "./viewer/viewer.js";
import { features } from "./services/api.js";
import { blobStore } from "./services/storage.js";

import * as tabs from "./ui/tabs.js";
import * as stage from "./ui/stage.js";
import * as designChat from "./ui/design-chat.js";
import * as designShape from "./ui/design-shape.js";
import * as designImport from "./ui/design-import.js";
import * as check from "./ui/check.js";
import * as price from "./ui/price.js";
import * as listing from "./ui/listing.js";
import * as exportPanel from "./ui/export.js";

const PANELS = [stage, designChat, designShape, check, price, listing, exportPanel];

const ctx = {
  state,
  current: null,        // { mesh, textInfo, analysis, evaluation, price } for the current spec
  imported: null,       // source mesh for the "imported" template
  features: {},         // { meshy, assistant, projects } reported by the server
  viewer: null,

  save: saveState,
  colorName: () => COLORS[state.color].name,
  dimsText: () => { const z = ctx.current.analysis.size; return `${z[0].toFixed(0)} × ${z[1].toFixed(0)} × ${z[2].toFixed(0)} mm`; },
  slug: () => slugify(state.spec.name),

  // Recompute everything from state and redraw.
  refresh({ animate = false } = {}) {
    const { mesh, textInfo } = buildModel(state.spec, ctx.imported);
    const analysis = analyze(mesh);
    const evaluation = evaluate(analysis, { printer: state.printer, material: state.material, infill: state.infill, textInfo });
    ctx.current = { mesh, textInfo, analysis, evaluation, price: pricing(evaluation, state) };
    ctx.viewer.showMesh(mesh, animate);
    for (const p of PANELS) if (p.render) p.render(ctx);
    saveState();
  },

  setSpec(spec, { animate = false, resetListing = false } = {}) {
    state.spec = sanitizeSpec(spec);
    if (resetListing) state.listing = { title: "", description: "", tags: "" };
    ctx.refresh({ animate });
  },

  async setImported(mesh) { ctx.imported = mesh; await blobStore.set("import", mesh); },
  renderChat: () => designChat.render(ctx),

  loadProject(p) {
    replaceState({ ...p.settings, spec: p.spec, listing: p.listing || defaultState().listing, projectId: p.id, chat: state.chat });
    if (state.spec.template === "imported" && !ctx.imported) state.spec = sanitizeSpec({ ...deepCopy(PRESETS.vase), text: state.spec.text });
    ctx.viewer.setColor(COLORS[state.color].hex);
    ctx.viewer.setPrinter(PRINTERS[state.printer]);
    listing.render(ctx);
    ctx.refresh({ animate: true });
  },

  startOver() {
    const keep = { printer: state.printer, material: state.material, costs: state.costs, market: state.market, color: state.color };
    replaceState(keep);
    designChat.render(ctx); listing.render(ctx);
    ctx.selectTab("design");
    ctx.refresh({ animate: true });
    $("#prompt").focus();
  }
};

async function boot() {
  ctx.features = await features();
  try { await loadFont("assets/fonts/helvetiker_bold.typeface.json"); } catch { /* letters disabled */ }
  if (state.spec.template === "imported") {
    ctx.imported = await blobStore.get("import");
    if (!ctx.imported) state.spec = sanitizeSpec(PRESETS.vase);
  }

  ctx.viewer = createViewer($("#viewport"), { color: COLORS[state.color].hex });
  ctx.viewer.setPrinter(PRINTERS[state.printer]);

  tabs.init(ctx, { onSelect: id => { if (id === "listing") listing.ensureListing(ctx); } });
  stage.init(ctx);
  designChat.init(ctx);
  designShape.init(ctx);
  designImport.init(ctx);
  check.init(ctx);
  price.init(ctx);
  listing.init(ctx);
  exportPanel.init(ctx);

  $("#aboutBtn").onclick = () => $("#about").showModal();
  $("#aboutClose").onclick = () => $("#about").close();

  ctx.refresh({ animate: true });
}

boot();
